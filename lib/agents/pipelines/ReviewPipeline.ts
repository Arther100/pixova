import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const reviewPipeline: PipelineHandler = async (event, _tracker, _memory) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.REVIEW_SUBMITTED: {
      // Future: auto-draft photographer reply agent, sentiment analysis
      agentsSkipped.push('review_reply_agent (not yet built)')
      agentsSkipped.push('sentiment_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.REVIEW_REPLIED: {
      agentsSkipped.push('reply_quality_checker (not yet built)')
      break
    }
    default:
      break
  }

  return {
    success:        true,
    output:         { event_type: event.event_type },
    agents_ran:     agentsRan,
    agents_skipped: agentsSkipped,
  }
}
