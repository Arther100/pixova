import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const paymentPipeline: PipelineHandler = async (event) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.PAYMENT_RECEIVED: {
      // Future: receipt generator, balance reminder agent
      agentsSkipped.push('receipt_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.PAYMENT_OVERDUE: {
      // Future: overdue reminder agent, escalation agent
      agentsSkipped.push('overdue_reminder (not yet built)')
      agentsSkipped.push('escalation_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.PAYMENT_FAILED: {
      agentsSkipped.push('payment_recovery_agent (not yet built)')
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
