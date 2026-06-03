import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const subscriptionPipeline: PipelineHandler = async (event, _tracker, _memory) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.TRIAL_ENDING: {
      // Future: personalised upgrade nudge agent (show what they'd unlock)
      agentsSkipped.push('upgrade_nudge_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.CHURN_RISK_DETECTED: {
      // Future: churn intervention agent, win-back campaign
      agentsSkipped.push('churn_intervention_agent (not yet built)')
      agentsSkipped.push('win_back_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.SUBSCRIPTION_EXPIRED: {
      agentsSkipped.push('reactivation_agent (not yet built)')
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
