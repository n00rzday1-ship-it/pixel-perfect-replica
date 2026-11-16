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
Existing AVFetch input
  -> server-side validation -> capability-aware platform adapter
  -> real metadata + permitted source references
  -> authenticated job request -> durable database queue
Local worker -> authenticated claim API -> bounded source fetch + ffprobe
  -> FFmpeg -> file verification -> private storage
  -> progress/completion API -> owner-only job status -> expiring download
```

### Contracts and boundaries

- Keep pure schemas/URL parsing in browser-safe modules; create one server-only adapter per platform behind a shared interface. App RPC wrappers live in `src/lib/*.functions.ts`; server helpers use `*.server.ts`. No Node-only media dependency enters the app bundle.
- `validateMedia`, `analyzeMedia`, `createJob`, `getJob`, `cancelJob`, `getDownload` are TanStack server functions. Validate again server-side and verify caller/access before protected operations. Preserve CSRF and add generated bearer middleware only after Cloud is connected.
- Worker claim/heartbeat/progress/completion and provider OAuth callbacks use `/api/public/*` server routes with handler authentication; this prefix is not a security boundary. Worker credentials never reach the browser. Deploy callback endpoints before requesting shared secrets.
- Analysis DTO: platform, canonical ID/URL, provider identity, nullable metadata, timestamp/expiry, capability status and reason, real source-format IDs. Source URLs/tokens stay in protected server data; frontend receives opaque selection IDs, not arbitrary processing URLs.
- Separate metadata-only, authorization-required, configuration-required, unavailable, processing-unavailable and ready states. Sanitized user errors; redact tokens and signed URLs from diagnostics. Avoid caching personal results across users.
- MP4 options come only from accessible renditions with provider/ffprobe evidence. No generated quality ladder or upscaling. Remux/copy compatible media where possible; any conversion is explicitly output encoding, not original quality.
- MP3 choices: proposed menu **64, 96, 128, 160, 192, 224, 256, 320 kbps**, only for a permitted source with audio. Server validates selections. They describe output bitrate, never original quality. Silent media cannot produce a pretend audio download.

### Jobs and storage

- Durable records: authorized source/analysis, processing jobs, job events, private output records and worker leases. Owner-only policies for reads/writes; narrow authenticated worker actions; no broad browser updates to progress/completion fields.
- States: queued, fetching, probing, converting, verifying, completed, failed, cancelled, expired. Atomically claim leased jobs; heartbeats, bounded retries, idempotent completion and stale-lease recovery prevent duplicate work. A stale attempt cannot overwrite a newer attempt.
- Real progress: received bytes when length is known; FFmpeg `-progress` output time versus measured duration for conversion. Unknown total means indeterminate progress; use stage-specific progress, not a fake overall timer. Completed only after file verification and successful private upload.
- Local worker polls over outbound HTTPS, so no public port on the local machine is needed. Use a non-root pinned container with CPU/memory/disk/time limits and a job-specific temporary directory. FFmpeg receives argument arrays and local files, not user URLs or shell strings; network access disabled during probing/conversion.
- Verify ffprobe output, expected codec/container, audio presence, dimensions, duration, byte size and checksum. Successful process exit alone is insufficient. Owner-authorized expiring storage links, sanitized filename and attachment headers gate downloads.
- Configurable retention and file/duration/concurrency caps must be agreed before processing rollout. Cleanup in `finally` plus startup and periodic janitors removes failed/cancelled/crashed-job files and expired storage objects; retries are recorded. Do not rely on browser activity for cleanup.

### SSRF and access protection

- Never fetch the pasted URL directly. Parse exact host/path/media ID and construct requests to fixed official API origins. Block credentials, custom ports, IP literals, encoded-path tricks and lookalike hosts.
- Adapter-returned source URLs also require validation. Disable automatic redirects; revalidate every permitted hop, restrict HTTPS/CDN hosts, bound response bytes/time and validate file signatures. Expired URLs trigger authorized refresh, not a fallback scraper.
- On the native worker, validate all DNS A/AAAA answers and connect to the validated public address while preserving TLS hostname verification. Block loopback/private/link-local/reserved/metadata addresses and enforce outbound firewall rules; reject DNS rebinding. Do not pass remote playlists to FFmpeg; any future manifest support must validate every nested resource.
- Protect OAuth with state, PKCE where supported and same-origin return destinations. Use secure connector/credential forms for third-party keys, server-only encrypted token storage where required, revocation handling and minimal scopes. Never log or commit secrets.
- **User decision: defer custom request limits.** Lovable Cloud has no standard request-limiting primitive. No ad-hoc limiter will be added. Public paid-provider analysis and public job submission remain disabled pending an approved protection solution. Provider quotas, authentication and worker concurrency caps are not substitutes for request limiting.

## Incremental delivery and tests

1. **Validation foundation:** strict platform IDs/paths, DTO schemas, adapter registry and real server validation. Test all four platforms plus malformed IDs, private hosts, credentials, redirects and lookalikes. Unconfigured adapters return explicit capability failures, not sample metadata.
2. **YouTube metadata pilot:** configure an approved developer key, request real metadata, handle unavailable/private/quota errors and wire only the existing Analyze result area. Confirm real title/thumbnail/duration through the UI; formats/downloads stay disabled.
3. **Authorized Instagram/LinkedIn adapters:** prove account/product access first, then test permalink/URN resolution, missing media URLs, expiry, ownership and revocation. X follows only after billing approval. Fixture-based unit tests are clearly test data, never app results.
4. **Cloud job foundation:** activate Cloud with approval, add ownership policies and atomic job/lease operations. Test cross-user access, forged worker messages, replay/stale attempts, cancellation and offline recovery. Keep processing restricted while request protection is deferred.
5. **Local processing pilot:** run a real user-owned authorized file through native ffprobe/FFmpeg, validate all listed MP3 bitrates and actual MP4 formats, report real progress, retrieve the verified output through the UI, then prove expiry and cleanup. Credentials/hardware availability are prerequisites; never call fixture-only results end-to-end verification.
6. **Release gate:** SSRF/redirect/DNS tests, file and resource limits, authorization audit, quota/cost measurements and desktop/mobile regression checks. Update privacy/availability copy only to match delivered behavior. Public processing waits for request protection, verified source permissions and a reachable worker. Publish app code separately; schema changes apply immediately.

## Required external inputs / blockers

- Provider developer credentials and granted account/product access; per-user account access requires appropriate OAuth, not a shared builder token.
- A reachable Linux machine with FFmpeg/ffprobe and sufficient storage/network access for processing.
- Cost approval before X or any paid infrastructure; no unlimited free production promise.
- Approved request protection before public processing. This has deliberately been deferred.

**First implementable slice after approval:** server-side strict validation and adapter contracts, then genuine YouTube metadata with configured access. This does not promise YouTube downloads or enable paid services.