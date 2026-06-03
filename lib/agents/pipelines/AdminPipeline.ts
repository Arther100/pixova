import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const adminPipeline: PipelineHandler = async (event) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.ERROR_P0: {
      // Future: root cause analyser, auto-escalation agent
      agentsSkipped.push('root_cause_analyser (handled by logger.ts AI agent)')
      break
    }
    case AGENT_EVENTS.ERROR_P1: {
      agentsSkipped.push('error_pattern_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.PHOTOGRAPHER_INACTIVE: {
      agentsSkipped.push('re_engagement_agent (not yet built)')
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
