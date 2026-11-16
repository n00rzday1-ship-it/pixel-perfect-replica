# AVFetch Phase 2: authorized media backend

## Scope and outcome

Preserve the existing logo, neon-green design, animations, navigation and phone/desktop layout. Add backend capabilities incrementally, never a frontend rewrite. This first task delivers a reviewed implementation plan only: no Cloud activation, credentials, schema changes or functioning-download claims yet.

**Important:** official APIs cannot turn AVFetch into an unrestricted, free downloader for arbitrary links. Metadata access, access to actual media files, and permission to convert/download are separate capabilities. Ownership alone does not override platform API terms.

## Existing code review

- Inspected the source tree, all content routes, shared shell, styles, UI library, link validation, tests, configuration and runtime/error support. Dependencies contain no media provider SDK, database client, queue, FFmpeg or processing service. No backend is connected.
- `src/routes/index.tsx` calls the synchronous browser-only `recognizeMedia`. Analyze does not make a network request. MP4/MP3 switches change the mode, not actual formats. The missing service message is intentional, not a failed download request.
- `src/lib/media.ts` validates HTTPS, exact platform hosts, credentials, ports and length. It does **not** validate platform media-ID/path syntax: profile/search/non-media paths can pass. Harden this before server access. Existing tests use abbreviated example IDs and must be updated alongside stricter rules.
- `src/start.ts` already has error and CSRF middleware; preserve both. `src/server.ts` is an SSR error wrapper, not a processing host. The hosting runtime cannot spawn FFmpeg or provide durable local job/file state.
- All ten content pages have individual title, description and social metadata through `pageHead`; preserve these. Privacy, terms, FAQ and platform availability must be updated narrowly when real data handling changes.
- Baseline: both existing test files passed, **5/5 tests**. These establish current recognition/routing behavior, not media integration correctness. No runtime/UI edits were made.

## Verified platform feasibility

| Platform | Genuine metadata | Actual media and formats | Authorization and launch decision |
| --- | --- | --- | --- |
| YouTube | Data API `videos.list` can return title, thumbnails and ISO-8601 duration; inaccessible/deleted/private videos may return no item. | Data API does not provide playable rendition URLs or a downloadable resolution list. `definition=hd` is not a format. OAuth/file details do not grant download access. | Public metadata needs a developer project/key and quota. Private metadata needs appropriate OAuth. Ship **metadata-only** first; downloads/audio extraction blocked unless a separately approved source and platform permission exist. |
| Instagram | Official API can return caption, media type, permalink, thumbnail and `media_url` when permitted. Caption is not a video title. Duration/resolution may require probing a permitted file. | May supply a single permitted source, not a full quality ladder. Licensed/copyrighted audio and some disabled-download settings can cause `media_url` omission even when other metadata is available. | Start with explicitly authorized Business/Creator account media. Instagram Login uses `instagram_business_basic`; Facebook Login has different permissions/Page requirements. App review/access may be required for non-test users. Arbitrary pasted personal/private reels are not guaranteed accessible. Resolve permalink against accessible media records, never scrape shortcode pages. |
| LinkedIn | Approved Posts/Videos access can return post text, thumbnail and duration, with fields absent when unavailable. | Videos API documents optional `downloadUrl` and expiry; not every accessible post yields a media file or rendition list. Probe only a permitted returned source. | Requires approved API product, OAuth scopes and owner/organization-role access. General member read access is restricted; write permission is not read permission. Resolve supported post identifiers, then authorized video URN. Start only after real account access is proven. |
| X | Post lookup with media expansion can return post text, preview image, duration, dimensions and `variants`. Text must be identified as post text, not an invented title. | Return only actual variants. MP4 variants may expose bitrate without variant-specific dimensions; probe each permitted file rather than copying overall dimensions or inferring resolution from bitrate. | Official API requires developer credentials and currently charges pay-per-use. Keep adapter disabled until costs and permitted use are approved. Builder app-only access is not permission to read each user's protected account. |

API-returned URLs are not, by themselves, permission to redistribute or convert. Each adapter must enforce an approved use case and record access provenance. Missing fields remain `null`; formats remain empty when inaccessible. No scraping, yt-dlp fallback, cookie uploads, DRM workarounds or invented resolutions.

Sources reviewed November 16, 2026:
- [YouTube video resource](https://developers.google.com/youtube/data/reference/rest/v3/videos) and [developer policies](https://developers.google.com/youtube/terms/developer-policies): audiovisual downloading/storage requires YouTube's prior written approval.
- [Instagram media](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media) and [business discovery limitations](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery).
- [LinkedIn Posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10) and [Videos](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2026-09). Pin a supported API version; do not use the retiring 202511 version.
- [X media fields](https://docs.x.com/x-api/fundamentals/data-dictionary) and [pricing](https://docs.x.com/x-api/getting-started/pricing). Current published post reads are $0.005/resource; other operations differ. Recheck Developer Console before enabling; no paid service is activated by this plan.

## Infrastructure and free-tier assessment

| Layer | Proposed use | Free-tier reality |
| --- | --- | --- |
| Existing app hosting | Validation, short provider requests, authentication, job orchestration and status | No FFmpeg, native binaries or background loops. Standalone Cloudflare Workers Free documents 100,000 requests/day, 10 ms CPU/invocation and 128 MB memory; these are **not** an assertion of this Lovable project's hosting quota. |
| Lovable Cloud | Built-in database, logins and private storage for durable jobs | Default for implementation. Check this workspace's current allowance/cost before activation; do not equate Lovable Cloud billing with a standalone provider free tier. |
| External managed Postgres free tier, evaluated for comparison | Jobs, leases, access records and short-lived private outputs | Published reference allowance: 500 MB database, 1 GB storage, 5 GB egress plus 5 GB cached egress; projects can pause after one week inactive. Not adequate for unlimited video storage/download traffic. Connecting an external service is not part of this first task. |
| Local Linux processing worker | Native FFmpeg/ffprobe, sandboxed downloads and conversion | Open-source dependencies have no software fee. Existing hardware still needs electricity, bandwidth, disk and uptime. Jobs stall while the machine is offline. No guaranteed always-on free production transcoding host is established. |

[Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/) / [limits](https://developers.cloudflare.com/workers/platform/limits/), and [managed database pricing reference](https://supabase.com/pricing). Recheck quotas before rollout. Use private storage for small verified test outputs initially; measure actual transfer usage before public launch.

## Technical architecture

```text
Existing input -> server validation -> official platform adapter
  -> real metadata + opaque permitted source IDs
  -> authenticated job -> durable database queue
Local Linux worker -> authenticated claim -> bounded fetch + ffprobe
  -> FFmpeg -> verification -> private storage
  -> real progress/status -> owner-only expiring download
```

- Keep pure URL/DTO schemas browser-safe. Separate server-only adapters for each platform; app RPC wrappers in `src/lib/*.functions.ts`, helpers in `*.server.ts`. No native processing dependency enters the app bundle.
- App calls: `validateMedia`, `analyzeMedia`, `createJob`, `getJob`, `cancelJob`, `getDownload` via TanStack server functions. Revalidate inputs and authorize protected operations; preserve CSRF and add generated bearer middleware after Cloud connection.
- Worker claim/heartbeat/progress/completion and OAuth callbacks use `/api/public/*` routes with authentication inside handlers. Deploy callbacks before requesting shared secrets. No public local-machine port is needed: the worker polls outbound HTTPS.
- Analysis DTO includes canonical platform ID, nullable metadata, timestamps/expiry, capability status/reason and genuine format IDs. Keep signed source URLs/tokens in protected server records. Distinguish configuration-required, authorization-required, metadata-only, unavailable, processing-unavailable and ready. Redact secrets from logs; return safe errors.
- MP4 choices require actual rendition evidence. Probe permitted files when dimensions are absent; no inferred resolutions, fake ladders or upscaling. Remux compatible media; explicitly label any output conversion.
- MP3 menu proposal: **64, 96, 128, 160, 192, 224, 256, 320 kbps**. Validate server-side and offer only when permitted source audio exists. Output bitrate never improves source quality.

### Jobs, files and security

- Durable owner-scoped analysis/source, job, event, output and lease records. Narrow worker operations; browser cannot set progress/completed fields. Atomic claims, bounded retries, idempotency, heartbeats and stale-attempt rejection prevent duplicate work.
- States: queued, fetching, probing, converting, verifying, completed, failed, cancelled, expired. Progress derives from actual bytes or FFmpeg `-progress` output time/measured duration. Unknown totals are indeterminate; no fabricated overall percentage. Complete only after verified file upload.
- Non-root pinned Linux container; bounded CPU/memory/disk/time, per-job temporary directories. FFmpeg uses argument arrays and local files, never user URLs/shell commands. Disable conversion/probe networking. Verify codecs, dimensions, duration, audio presence, size and checksum, not only exit status.
- Private output storage, owner-authorized short-lived download links, safe filenames and attachment headers. Agree configurable retention, file/duration and concurrency caps before rollout. Cleanup in `finally`, at worker startup and through periodic janitors; delete expired stored outputs and record failures/retries.
- SSRF: never fetch pasted URLs; construct fixed official API requests from validated IDs. Reject credentials, custom ports, IP literals, lookalike hosts and encoded-path tricks. Validate adapter source URLs too, disable automatic redirects, revalidate every allowed hop, bound bytes/time and check file signatures.
- Native worker resolves all A/AAAA answers, rejects private/loopback/link-local/reserved/metadata addresses, pins the validated address while preserving TLS hostname verification and uses outbound firewall restrictions against DNS rebinding. Do not feed remote playlists to FFmpeg; any later manifest support must validate every nested resource.
- OAuth uses state, PKCE where supported, minimal scopes, same-origin return destinations and revocation handling. Third-party credentials use secure connector/forms; encrypted server token storage where needed. Never commit/log secrets or cache private results across users.
- **User decision: defer custom request limits.** Lovable Cloud has no standard limiter; add no ad-hoc implementation. Public paid-provider analysis and public job submission stay disabled pending approved request protection. Authentication, provider quotas and concurrency caps are not substitutes.

## Incremental implementation and verification

1. **Validation foundation:** strict platform ID/path parsers, schemas, registry and server validation. Tests for all platforms, malformed IDs, private hosts, credentials, redirects/lookalikes. Unconfigured adapters return explicit failures, never demo metadata.
2. **YouTube metadata pilot:** approved key/access, genuine metadata and unavailable/private/quota handling; wire only the existing result area. Verify real title/thumbnail/duration through the UI; formats/downloads remain disabled.
3. **Authorized adapters:** prove Instagram/LinkedIn account/product access first; then test permalink/URN resolution, missing sources, expiry and revocation. X waits for billing approval. Fixtures exist only in tests.
4. **Cloud jobs:** activate with approval; owner policies, atomic claims and leases. Test cross-user access, forged/replayed worker calls, stale attempts, cancellation and offline recovery. Keep processing restricted while request protection is deferred.
5. **Local processing pilot:** real authorized user-owned file through ffprobe/FFmpeg; test each listed MP3 bitrate and source-derived MP4 choice. Verify progress, downloadable output read-back, expiry and cleanup in the UI. Fixture-only runs are not end-to-end verification.
6. **Release gate:** SSRF/DNS/redirect tests, resource bounds, permissions audit, measured quota/cost use, phone/desktop regression checks. Update privacy/availability copy narrowly. Public processing requires approved request protection, permissions and reachable worker. App code needs publishing; database changes apply immediately.

## Required external inputs / blockers

- Provider developer credentials and granted account/product access; per-user account access requires appropriate OAuth, not a shared builder token.
- A reachable Linux machine with FFmpeg/ffprobe and sufficient storage/network access for processing.
- Cost approval before X or any paid infrastructure; no unlimited free production promise.
- Approved request protection before public processing. This has deliberately been deferred.

**First implementable slice after approval:** server-side strict validation and adapter contracts, then genuine YouTube metadata with configured access. This does not promise YouTube downloads or enable paid services.