import 'server-only'
import { BaseAgent } from './BaseAgent'
import { MODELS } from './config'

export interface OrchestrationPlan {
  agents_to_run: Array<{
    agent: string
    parallel_group: number
    token_budget_override?: { input: number; output: number }
    skip_reason?: string
  }>
  agents_to_skip: Array<{ agent: string; reason: string }>
  context_depth: 'minimal' | 'standard' | 'deep'
  estimated_total_tokens: number
  reasoning: string
}

export interface OrchestratorInput {
  event_type: string
  studio_name: string
  plan: string
  has_packages: boolean
  package_count: number
  has_past_replies: boolean
  has_reviews: boolean
  token_budget_remaining: number
  avg_rating: number
  days_since_signup: number
  available_agents: string[]
}

export class MasterOrchestrator extends BaseAgent<OrchestratorInput, OrchestrationPlan> {
  readonly name        = 'master_orchestrator'
  readonly model       = MODELS.ORCHESTRATOR
  readonly temperature = 0.2
  readonly maxInputTokens  = 1000
  readonly maxOutputTokens = 400

  readonly systemPrompt = `You are the master orchestrator for Pixova's AI agent platform.
Your job is to plan which agents to run for a given event, optimising for quality AND cost.

RULES:
1. Skip agents when their output is predictable (e.g. only 1 package exists → skip strategy)
2. Group independent agents for parallel execution (same group number = parallel)
3. Never exceed token budgets
4. Provide clear reasoning for every decision
5. Context depth: minimal for simple events, deep for complex or high-value events
6. Output valid JSON only.`

  buildPrompt(input: OrchestratorInput): string {
    return `Event: ${input.event_type}
Studio: ${input.studio_name} (${input.plan} plan)
Context:
  Has packages: ${input.has_packages}
  Package count: ${input.package_count}
  Has past replies: ${input.has_past_replies}
  Has reviews: ${input.has_reviews}
  Token budget remaining: ${input.token_budget_remaining}
  Studio avg rating: ${input.avg_rating}
  Days active: ${input.days_since_signup}

Available agents for this pipeline:
${input.available_agents.join(', ')}

Decide which agents to run and in what groups.
Output JSON matching OrchestrationPlan type.`
  }

  parseOutput(raw: string): OrchestrationPlan {
    return this.safeParseJSON(raw, this.getFallback({} as OrchestratorInput))
  }

  getFallback(_: OrchestratorInput): OrchestrationPlan {
    return {
      agents_to_run:          [],
      agents_to_skip:         [],
      context_depth:          'standard',
      estimated_total_tokens: 0,
      reasoning:              'Orchestrator fallback — running default plan',
    }
  }
}
