import { describe, expect, it } from 'vitest';
import { analyzeAuthorizedMedia } from '../lib/media-adapters.server';
import { mp3BitrateSchema } from '../lib/media-analysis';

describe('Authorized analysis boundaries', () => {
  for (const url of ['https://youtu.be/dQw4w9WgXcQ', 'https://instagram.com/reel/ABCDE123/', 'https://linkedin.com/feed/update/urn:li:activity:123456789/', 'https://x.com/example/status/123']) {
    it(`never invents metadata or formats for ${new URL(url).hostname}`, async () => {
      const result = await analyzeAuthorizedMedia(url);
      expect(result.metadata).toBeNull();
      expect(result.formats).toEqual([]);
      expect(result.downloadsEnabled).toBe(false);
      expect(['configuration-required', 'authorization-required']).toContain(result.status);
    });
  }
  it('accepts only supported MP3 output bitrates between 64 and 320 kbps', () => {
    for (const bitrate of [64, 96, 128, 160, 192, 224, 256, 320]) expect(mp3BitrateSchema.parse(bitrate)).toBe(bitrate);
    for (const bitrate of [0, 63, 65, 321, 512]) expect(mp3BitrateSchema.safeParse(bitrate).success).toBe(false);
  });
  it('rejects a private target before any adapter access', async () => {
    await expect(analyzeAuthorizedMedia('https://127.0.0.1/media')).rejects.toThrow();
  });
});