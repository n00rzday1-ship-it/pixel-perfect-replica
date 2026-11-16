import { createServerFn } from '@tanstack/react-start';
import { analysisInput } from './media-analysis';
import { recognizeMedia, mediaError } from './media';
import { analyzeAuthorizedMedia } from './media-adapters.server';

// Public validation/capability lookup only: no stored data, tokens, media fetches
// or paid provider requests. Processing is intentionally not exposed.
export const validateMedia = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => analysisInput.parse(input))
  .handler(({ data }) => {
    try { return { ok: true as const, media: recognizeMedia(data.url) }; }
    catch (error) { return { ok: false as const, error: mediaError(error) }; }
  });
export const analyzeMedia = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => analysisInput.parse(input))
  .handler(async ({ data }) => {
    try { return { ok: true as const, analysis: await analyzeAuthorizedMedia(data.url) }; }
    catch (error) { return { ok: false as const, error: mediaError(error) }; }
  });