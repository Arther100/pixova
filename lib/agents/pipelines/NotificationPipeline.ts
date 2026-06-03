import type { PipelineHandler } from '../types'

export const notificationPipeline: PipelineHandler = async (event, _tracker, _memory) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  // Future: smart notification timing agent, channel selection agent
  // (WhatsApp vs email vs in-app based on user preferences and time of day)
  agentsSkipped.push(`notification_router (not yet built) for ${event.event_type}`)

  return {
    success:        true,
    output:         { event_type: event.event_type },
    agents_ran:     agentsRan,
    agents_skipped: agentsSkipped,
  }
}
