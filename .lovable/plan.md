# AVFetch Phase 2: authorized media backend

## Scope and outcome

Preserve the existing logo, neon-green design, animations, navigation and phone/desktop layout. Add backend capabilities incrementally, never a frontend rewrite. This first task delivers a reviewed implementation plan only: no Cloud activation, credentials, schema changes or functioning-download claims yet.

**Important:** official APIs cannot turn AVFetch into an unrestricted, free downloader for arbitrary links. Metadata access, access to actual media files, and permission to convert/download are separate capabilities. Ownership alone does not override platform API terms.

## Existing code review

Reviewed the source tree, content routes, shell, styles, UI library, validation, tests, configuration and runtime support. There is no connected backend, provider SDK, queue or processing host.

- Analyze calls browser-only `recognizeMedia`, with no network request. MP4/MP3 changes mode only. The unavailable-service message is intentional.
- Validation checks HTTPS, exact hosts, credentials, ports and length, but accepts non-media platform paths. Add strict IDs/paths before server access; update abbreviated test IDs.
- Preserve existing CSRF/error middleware, shared shell and all ten independently described content pages. The server entry is an SSR wrapper, not an FFmpeg host.
- Baseline tests passed: **5/5** across both existing files. These verify recognition/routing, not media integration. No application code changed.

## Platform feasibility

| Platform | Real capabilities | Access and limitations |
| --- | --- | --- |
| YouTube | Data API returns title, thumbnails and duration. | Developer key/quota for public metadata; OAuth for permitted private metadata. No downloadable rendition URLs/quality ladder. Ship metadata-only; audiovisual downloading/storage requires prior written YouTube approval. Ownership/OAuth alone is insufficient. |
| Instagram | Caption, thumbnail and permitted `media_url`; probe permitted source for missing duration/dimensions. | Start with authorized Business/Creator media; appropriate login permissions and potentially app review. Resolve permalink against accessible records, not scraping. May return one source, not a quality ladder. Licensed audio/download restrictions can omit media URLs. Arbitrary personal/private reels are not guaranteed accessible. |
| LinkedIn | Approved Posts/Videos access may return post text, thumbnail, duration and optional expiring `downloadUrl`. | Product approval, OAuth scopes and owner/organization roles required. Member reads are restricted; write access does not imply read access. Resolve supported post IDs to authorized video URNs. Missing file URLs remain unavailable. |
| X | Post/media expansion returns text, preview, duration and actual variants. | Developer access and paid reads required. Enable only after cost/use approval. Probe variant-specific dimensions rather than inferring from bitrate. Shared app-only tokens cannot read each user's protected account. |

API source access does not automatically authorize conversion/redistribution. Adapters record approved use and access provenance. Missing fields stay null and missing formats empty. Identify captions/post text honestly, not invented video titles. No scraping, yt-dlp fallback, cookies or DRM workarounds.

### Official sources reviewed November 16, 2026

- [YouTube resource](https://developers.google.com/youtube/data/reference/rest/v3/videos), [policies](https://developers.google.com/youtube/terms/developer-policies).
- [Instagram media](https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media), [media URL restrictions](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery). Instagram Login uses `instagram_business_basic`; Facebook Login differs.
- [LinkedIn Posts](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10), [Videos](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api?view=li-lms-2026-09). Pin supported API versions, not retiring 202511.
- [X fields](https://docs.x.com/x-api/fundamentals/data-dictionary), [pricing](https://docs.x.com/x-api/getting-started/pricing): published post reads $0.005/resource; other operations differ. Recheck console before enabling.

## Free infrastructure assessment

- **Existing app hosting:** short API requests, validation and orchestration only; no FFmpeg or durable local state. Standalone Cloudflare Workers Free documents 100,000 requests/day, 10 ms CPU and 128 MB memory. These are not this Lovable project's verified quotas. [Pricing](https://developers.cloudflare.com/workers/platform/pricing/) / [limits](https://developers.cloudflare.com/workers/platform/limits/).
- **Lovable Cloud:** default built-in database, logins and private storage when implementation begins. Check workspace allowances/cost before activation; do not equate its billing with standalone free-tier quotas.
- **External managed database free-tier comparison:** 500 MB database, 1 GB files, 5 GB egress plus 5 GB cached egress; inactivity may pause projects after one week. Not unlimited video hosting. No external connection is proposed for this first task. [Pricing reference](https://supabase.com/pricing).
- **Local Linux worker:** free open-source FFmpeg/ffprobe on existing hardware, but electricity, bandwidth, disk and uptime remain costs. Jobs wait when offline. No guaranteed always-on free production transcoding host is established.

Small private test outputs fit a pilot; measure transfers before launch. Unlimited free downloads, unrestricted platform access and free X reads cannot be promised. No paid service is activated by this plan.

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