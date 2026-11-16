import type { MediaAnalysis } from './media-analysis';
import { recognizeMedia, type Platform } from './media';

type MediaReference = ReturnType<typeof recognizeMedia>;
export interface PlatformAdapter {
  analyze(reference: MediaReference): Promise<MediaAnalysis>;
}
function blocked(reference: MediaReference, status: MediaAnalysis['status'], reason: string): MediaAnalysis {
  return { platform: reference.platform, mediaId: reference.mediaId, status, reason, metadata: null, formats: [], downloadsEnabled: false };
}
// Separate capability boundaries: no adapter performs network requests until its
// credentials, permitted use and provider response mapping are verified.
export class YouTubeAdapter implements PlatformAdapter {
  async analyze(reference: MediaReference) {
    return blocked(reference, 'configuration-required', 'YouTube metadata access is not configured. The official API does not provide download formats.');
  }
}
export class InstagramAdapter implements PlatformAdapter {
  async analyze(reference: MediaReference) {
    return blocked(reference, 'authorization-required', 'Instagram requires approved access to an authorized professional account before media can be retrieved.');
  }
}
export class LinkedInAdapter implements PlatformAdapter {
  async analyze(reference: MediaReference) {
    return blocked(reference, 'authorization-required', 'LinkedIn requires approved API access and permission to read this post and its media.');
  }
}
export class XAdapter implements PlatformAdapter {
  async analyze(reference: MediaReference) {
    return blocked(reference, 'configuration-required', 'X media access is disabled pending developer access and approval of API read costs.');
  }
}
const adapters: Record<Platform, PlatformAdapter> = {
  YouTube: new YouTubeAdapter(), Instagram: new InstagramAdapter(),
  LinkedIn: new LinkedInAdapter(), X: new XAdapter(),
};
export async function analyzeAuthorizedMedia(url: string): Promise<MediaAnalysis> {
  const reference = recognizeMedia(url);
  return adapters[reference.platform].analyze(reference);
}