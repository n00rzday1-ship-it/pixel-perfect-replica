import { z } from 'zod';

export type Platform = 'YouTube' | 'Instagram' | 'LinkedIn' | 'X';
const hosts: Record<string, Platform> = {
  'youtube.com': 'YouTube', 'www.youtube.com': 'YouTube', 'm.youtube.com': 'YouTube', 'youtu.be': 'YouTube',
  'instagram.com': 'Instagram', 'www.instagram.com': 'Instagram',
  'linkedin.com': 'LinkedIn', 'www.linkedin.com': 'LinkedIn',
  'x.com': 'X', 'www.x.com': 'X', 'twitter.com': 'X', 'www.twitter.com': 'X',
};
export function recognizeMedia(input: string): { url: string; platform: Platform; mediaId: string } {
  const value = z.string().trim().min(1, 'Paste a media link to get started.').max(2048, 'This link is too long.').url('Enter a complete, valid media URL.').parse(input);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('Use a secure HTTPS media link without credentials or custom ports.');
  const platform = hosts[url.hostname.toLowerCase()];
  if (!platform) throw new Error('This link is not supported. Use a YouTube, Instagram, LinkedIn, or X media link.');
  if (/%|\\/.test(url.pathname)) throw new Error('Use a direct video or post link without encoded path characters.');
  let mediaId: string | undefined;
  if (platform === 'YouTube') {
    mediaId = url.hostname === 'youtu.be' ? url.pathname.match(/^\/([\w-]{11})\/?$/)?.[1]
      : url.pathname === '/watch' && url.searchParams.getAll('v').length === 1 ? url.searchParams.get('v') ?? undefined
      : url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})\/?$/)?.[1];
    if (mediaId && !/^[\w-]{11}$/.test(mediaId)) mediaId = undefined;
  } else if (platform === 'Instagram') {
    mediaId = url.pathname.match(/^\/(?:p|reel|reels|tv)\/([\w-]{5,64})\/?$/)?.[1];
  } else if (platform === 'X') {
    mediaId = url.pathname.match(/^\/(?:[\w]{1,15}|i\/web)\/status\/([1-9]\d{0,19})(?:\/(?:video|photo)\/[1-4])?\/?$/)?.[1];
  } else {
    mediaId = url.pathname.match(/^\/feed\/update\/urn:li:(?:activity|ugcPost|share):([1-9]\d{0,19})\/?$/)?.[1]
      ?? url.pathname.match(/^\/posts\/[\w-]+-activity-([1-9]\d{0,19})-[\w-]+\/?$/)?.[1];
  }
  if (!mediaId) throw new Error('Paste a complete link to a specific video or post, not a homepage, profile, or search page.');
  url.hash = '';
  return { url: url.href, platform, mediaId };
}
export function mediaError(error: unknown) {
  return error instanceof z.ZodError ? error.issues[0]?.message ?? 'Invalid link.' : error instanceof Error ? error.message : 'Could not check this link.';
}