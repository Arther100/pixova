import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const marketplacePipeline: PipelineHandler = async (event, _tracker, _memory) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.PROFILE_VIEWED: {
      // Future: profile optimisation suggester, conversion rate analyser
      agentsSkipped.push('profile_optimizer (not yet built)')
      break
    }
    case AGENT_EVENTS.SEARCH_PERFORMED: {
      // Future: search intent classifier, ranking feedback agent
      agentsSkipped.push('search_intent_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.STUDIO_SAVED: {
      // Future: warm lead follow-up agent
      agentsSkipped.push('warm_lead_agent (not yet built)')
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
