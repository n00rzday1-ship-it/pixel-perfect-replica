import { describe, expect, it } from 'vitest';
import { recognizeMedia } from '../lib/media';
describe('Authorized platform URL boundaries', () => {
  it('recognizes the four requested platforms', () => {
    expect(recognizeMedia('https://youtu.be/dQw4w9WgXcQ').platform).toBe('YouTube');
    expect(recognizeMedia('https://instagram.com/p/ABCDE123').platform).toBe('Instagram');
    expect(recognizeMedia('https://linkedin.com/posts/example-title-activity-123456789-ABCD').platform).toBe('LinkedIn');
    expect(recognizeMedia('https://x.com/user/status/123').platform).toBe('X');
  });
  it('blocks private hosts and platform lookalikes', () => {
    for (const url of ['https://localhost/video', 'https://127.0.0.1/video', 'https://192.168.1.1/video', 'https://youtube.com.evil.test/video']) expect(() => recognizeMedia(url)).toThrow();
  });
  it('rejects credentials and nonsecure URLs', () => {
    expect(() => recognizeMedia('https://user:pass@youtube.com/watch?v=abc')).toThrow();
    expect(() => recognizeMedia('http://youtube.com/watch?v=abc')).toThrow();
  });
  it('does not treat platform homepages as media', () => {
    expect(() => recognizeMedia('https://youtube.com/')).toThrow();
  });
  it('rejects profile, search and malformed media paths', () => {
    for (const url of ['https://youtube.com/watch?v=abc', 'https://instagram.com/example', 'https://linkedin.com/in/example', 'https://x.com/search?q=video', 'https://youtube.com/redirect?q=https://127.0.0.1', 'https://instagram.com/p/ABCDE%2F123']) expect(() => recognizeMedia(url)).toThrow();
  });
  it('extracts identifiers from supported alternate paths', () => {
    expect(recognizeMedia('https://youtube.com/shorts/dQw4w9WgXcQ').mediaId).toBe('dQw4w9WgXcQ');
    expect(recognizeMedia('https://linkedin.com/feed/update/urn:li:activity:123456789/').mediaId).toBe('123456789');
  });
});