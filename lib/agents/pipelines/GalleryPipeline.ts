import { AGENT_EVENTS } from '../config'
import type { PipelineHandler } from '../types'

export const galleryPipeline: PipelineHandler = async (event, _tracker, _memory) => {
  const agentsRan: string[]     = []
  const agentsSkipped: string[] = []

  switch (event.event_type) {
    case AGENT_EVENTS.GALLERY_PHOTOS_UPLOADED: {
      // Future: auto-curation agent, watermark agent, delivery email agent
      agentsSkipped.push('photo_curator (not yet built)')
      agentsSkipped.push('delivery_composer (not yet built)')
      break
    }
    case AGENT_EVENTS.GALLERY_PUBLISHED: {
      // Future: client notification agent, social caption generator
      agentsSkipped.push('client_notifier (not yet built)')
      agentsSkipped.push('caption_generator (not yet built)')
      break
    }
    case AGENT_EVENTS.GALLERY_VIEWED: {
      // Future: engagement analytics agent
      agentsSkipped.push('engagement_tracker (not yet built)')
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
