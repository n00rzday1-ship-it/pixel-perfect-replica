import { describe, expect, it } from 'vitest';
import { recognizeMedia } from '../lib/media';
describe('Authorized platform URL boundaries', () => {
  it('recognizes the four requested platforms', () => {
    expect(recognizeMedia('https://youtu.be/abc').platform).toBe('YouTube');
    expect(recognizeMedia('https://instagram.com/p/abc').platform).toBe('Instagram');
    expect(recognizeMedia('https://linkedin.com/posts/abc').platform).toBe('LinkedIn');
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
});