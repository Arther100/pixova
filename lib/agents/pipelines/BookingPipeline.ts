import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const bookingPipeline: PipelineHandler = async (event) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.ENQUIRY_RECEIVED: {
      // Future: multi-agent enquiry reply system plugs in here
      agentsSkipped.push('enquiry_reply_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.BOOKING_CONFIRMED: {
      // Future: preparation checklist agent, smart reminder scheduler
      agentsSkipped.push('preparation_agent (not yet built)')
      agentsSkipped.push('reminder_scheduler (not yet built)')
      break
    }
    case AGENT_EVENTS.BOOKING_APPROACHING: {
      // Future: pre-event briefing agent
      agentsSkipped.push('briefing_agent (not yet built)')
      break
    }
    case AGENT_EVENTS.BOOKING_CANCELLED: {
      agentsSkipped.push('cancellation_handler (not yet built)')
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
