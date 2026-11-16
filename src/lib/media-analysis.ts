import { z } from 'zod';
import type { Platform } from './media';

export const analysisInput = z.object({ url: z.string().trim().min(1).max(2048) }).strict();
export const mp3Bitrates = [64, 96, 128, 160, 192, 224, 256, 320] as const;
export const mp3BitrateSchema = z.union([
  z.literal(64), z.literal(96), z.literal(128), z.literal(160),
  z.literal(192), z.literal(224), z.literal(256), z.literal(320),
]);
export type AnalysisStatus = 'configuration-required' | 'authorization-required' | 'metadata-only' | 'unavailable';
export type MediaFormat = { id: string; container: string; width: number | null; height: number | null; hasAudio: boolean | null };
export type MediaAnalysis = {
  platform: Platform;
  mediaId: string;
  status: AnalysisStatus;
  reason: string;
  metadata: { title: string | null; thumbnail: string | null; durationSeconds: number | null } | null;
  formats: MediaFormat[];
  downloadsEnabled: false;
};