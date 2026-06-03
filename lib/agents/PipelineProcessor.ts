import 'server-only'
import { createSupabaseAdmin } from '@/lib/supabase'
import { TokenTracker } from './TokenTracker'
import { getPipeline } from './PipelineRegistry'
import type { PipelineResult, ProcessedEvent, StudioAIMemory } from './types'

// ── Public entry point ────────────────────────────────────────
export async function processPipeline(
  eventId: string,
  pipelineName: string
): Promise<void> {
  const startTime    = Date.now()
  const supabaseAdmin = createSupabaseAdmin()

  // 1. Load event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: event } = await (supabaseAdmin.from('agent_events') as any)
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (!event) return

  // 2. Mark as PROCESSING
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin.from('agent_events') as any)
    .update({ status: 'PROCESSING', processed_at: new Date().toISOString() })
    .eq('event_id', eventId)

  // 3. Create pipeline run record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: run } = await (supabaseAdmin.from('agent_pipeline_runs') as any)
    .insert({
      event_id:      eventId,
      pipeline_name: pipelineName,
      studio_id:     event.studio_id,
      status:        'RUNNING',
    })
    .select('run_id')
    .single()

  if (!run) return

  // 4. Check studio token budget
  const budget = await checkStudioBudget(event.studio_id)
  if (!budget.allowed) {
    await completePipelineRun(supabaseAdmin, run.run_id, {
      status:        'SKIPPED',
      error_message: 'Studio daily token budget exceeded',
    })
    return
  }

  // 5. Load studio AI memory
  const memory = await loadStudioMemory(event.studio_id)

  // 6. Enrich event with full context
  const enrichedEvent = await enrichEvent(event, memory)

  // 7. Token tracker for this pipeline
  const tracker = new TokenTracker(pipelineName)

  // 8. Get pipeline handler
  const handler = getPipeline(pipelineName)
  if (!handler) {
    await completePipelineRun(supabaseAdmin, run.run_id, {
      status:        'FAILED',
      error_message: `No handler for pipeline: ${pipelineName}`,
    })
    return
  }

  // 9. Execute with 30s timeout
  let result: PipelineResult
  try {
    result = await Promise.race([
      handler(enrichedEvent, tracker, memory),
      pipelineTimeout(30_000),
    ])
  } catch (err) {
    result = {
      success:        false,
      output:         {},
      agents_ran:     [],
      agents_skipped: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }

  // 10. Save pipeline run results
  const summary = tracker.getSummary()
  await completePipelineRun(supabaseAdmin, run.run_id, {
    status:               result.success ? 'COMPLETED' : 'FAILED',
    agents_ran:           result.agents_ran,
    agents_skipped:       result.agents_skipped,
    pipeline_output:      result.output,
    total_input_tokens:   summary.total_input,
    total_output_tokens:  summary.total_output,
    total_cost_usd:       summary.total_cost_usd,
    duration_ms:          Date.now() - startTime,
    error_message:        result.error,
  })

  // 11. Save individual agent runs
  for (const [agentName, usage] of Object.entries(summary.agents)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin.from('agent_runs') as any).insert({
      pipeline_run_id: run.run_id,
      agent_name:      agentName,
      model:           usage.model,
      status:          usage.status,
      input_tokens:    usage.input,
      output_tokens:   usage.output,
      cost_usd:        usage.cost,
      duration_ms:     usage.duration,
    })
  }

  // 12. Increment studio token usage
  const totalTokens = summary.total_input + summary.total_output
  if (event.studio_id && totalTokens > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin.rpc as any)('increment_token_usage', {
      p_studio_id: event.studio_id,
      p_tokens:    totalTokens,
      p_cost:      summary.total_cost_usd,
    })
  }

  // 13. Update event status to COMPLETED
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin.from('agent_events') as any)
    .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
    .eq('event_id', eventId)
}

// ── Helpers ───────────────────────────────────────────────────

function pipelineTimeout(ms: number): Promise<PipelineResult> {
  return new Promise(resolve =>
    setTimeout(() => resolve({
      success:        false,
      output:         {},
      agents_ran:     [],
      agents_skipped: [],
      error:          `Pipeline timeout (${ms / 1000}s)`,
    }), ms)
  )
}

async function completePipelineRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  runId: string,
  data: {
    status: string
    error_message?: string
    agents_ran?: string[]
    agents_skipped?: string[]
    pipeline_output?: Record<string, unknown>
    total_input_tokens?: number
    total_output_tokens?: number
    total_cost_usd?: number
    duration_ms?: number
  }
): Promise<void> {
  await supabaseAdmin
    .from('agent_pipeline_runs')
    .update({ ...data, completed_at: new Date().toISOString() })
    .eq('run_id', runId)
}

async function checkStudioBudget(
  studioId: string | null
): Promise<{ allowed: boolean }> {
  if (!studioId) return { allowed: true }

  const supabaseAdmin = createSupabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: budget } = await (supabaseAdmin.from('token_budget_registry') as any)
    .select('tokens_used')
    .eq('studio_id', studioId)
    .eq('date', today)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: memory } = await (supabaseAdmin.from('studio_ai_memory') as any)
    .select('daily_token_limit')
    .eq('studio_id', studioId)
    .maybeSingle()

  const limit = (memory?.daily_token_limit as number | null) ?? 50_000
  const used  = (budget?.tokens_used  as number | null) ?? 0

  return { allowed: used < limit }
}

async function loadStudioMemory(
  studioId: string | null
): Promise<StudioAIMemory | null> {
  if (!studioId) return null

  const supabaseAdmin = createSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabaseAdmin.from('studio_ai_memory') as any)
    .select('*')
    .eq('studio_id', studioId)
    .maybeSingle()

  return (data as StudioAIMemory | null)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichEvent(event: any, memory: StudioAIMemory | null): Promise<ProcessedEvent> {
  const supabaseAdmin = createSupabaseAdmin()

  const [studioRes, photographerRes, subscriptionRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin.from('studio_profiles') as any)
      .select('id, name, slug, city, state, specializations, starting_price, avg_rating, review_count, is_listed, profile_complete')
      .eq('id', event.studio_id)
      .maybeSingle(),

    supabaseAdmin
      .from('photographers')
      .select('full_name, phone, subscription_status')
      .eq('photographer_id', event.photographer_id)
      .maybeSingle(),

    supabaseAdmin
      .from('subscriptions')
      .select('plan_id, status, trial_ends_at, current_period_end')
      .eq('studio_id', event.studio_id ?? '')
      .in('status', ['active', 'trialing', 'TRIAL', 'ACTIVE'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const plan = (subscriptionRes.data as { plan_id?: string } | null)?.plan_id ?? 'trial'

  return {
    event_id:        event.event_id,
    event_type:      event.event_type,
    studio_id:       event.studio_id,
    photographer_id: event.photographer_id,
    client_id:       event.client_id,
    account_id:      event.account_id,
    payload:         event.payload ?? {},
    priority:        event.priority,
    context: {
      studio:       studioRes.data      as Record<string, unknown> | null,
      photographer: photographerRes.data as Record<string, unknown> | null,
      subscription: subscriptionRes.data as Record<string, unknown> | null,
      memory,
      plan,
    },
  }
}
