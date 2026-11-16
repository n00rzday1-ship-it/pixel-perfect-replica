import { z } from 'zod';

export type Platform = 'YouTube' | 'Instagram' | 'LinkedIn' | 'X';
const hosts: Record<string, Platform> = {
  'youtube.com': 'YouTube', 'www.youtube.com': 'YouTube', 'm.youtube.com': 'YouTube', 'youtu.be': 'YouTube',
  'instagram.com': 'Instagram', 'www.instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn', 'www.linkedin.com': 'LinkedIn',
  'x.com': 'X', 'www.x.com': 'X', 'twitter.com': 'X', 'www.twitter.com': 'X',
};
export function recognizeMedia(input: string): { url: string; platform: Platform } {
  const value = z.string().trim().min(1, 'Paste a media link to get started.').max(2048, 'This link is too long.').url('Enter a complete, valid media URL.').parse(input);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Use a secure HTTPS media link without credentials or custom ports.');
  const platform = hosts[url.hostname.toLowerCase()];
  if (!platform) throw new Error('This link is not supported. Use a YouTube, Instagram, LinkedIn, or X media link.');
  if (url.pathname === '/' && !url.searchParams.has('v')) throw new Error('Paste a link to a specific video or post, not a platform homepage.');
  return { url: url.href, platform };
}
export function mediaError(error: unknown) {
  return error instanceof z.ZodError ? error.issues[0]?.message ?? 'Invalid link.' : error instanceof Error ? error.message : 'Could not check this link.';
}