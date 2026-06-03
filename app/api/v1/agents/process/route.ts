export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { processPipeline } from '@/lib/agents/PipelineProcessor'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-agent-secret')
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as { event_id: string; pipelines: string[] }
  const { event_id, pipelines } = body

  if (!event_id || !Array.isArray(pipelines)) {
    return Response.json({ error: 'event_id and pipelines[] required' }, { status: 400 })
  }

  // Run all pipelines concurrently — errors are silenced per-pipeline
  await Promise.allSettled(
    pipelines.map((pipeline: string) => processPipeline(event_id, pipeline))
  )

  return Response.json({ success: true })
}
