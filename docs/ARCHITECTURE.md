# Vidora — Technical Architecture

> AI content studio: prompt/script assistant, image generation, video generation, and voice
> cloning — powered by the **Claude API** (assistant) and the **Higgsfield API** (image/video/audio).
> Backend: **Django**. Frontend: the existing **React 19 + Vite SPA** (now router-driven).

**Status:** design doc. Nothing here is built yet on the backend; the repo currently contains a
frontend-only prototype.

---

## 1. Scope

| # | Feature | Engine | Phase |
|---|---------|--------|-------|
| 1 | **Prompton** — assistant that writes prompts & scripts | Claude API | MVP |
| 2 | **Image generation** — prompt + 1–5 reference images / characters | Higgsfield **Soul** | MVP |
| 3 | **Video generation** — image(s) + prompt → video | Higgsfield **Image-to-Video** (`images_list`) | MVP |
| 4 | **Voice cloning** — clone a voice → TTS → auto voiceover on video | Higgsfield **Audio** + lipsync | Phase 2 |
| 5 | **Video editor** — in-app trim/timeline so creators don't leave for CapCut | **Remotion** (server render) | Phase 3 (deferred) |

**Design principle for #4:** voice goes through a **provider abstraction** (`VoiceProvider`
interface). We build against Higgsfield Audio first, but ElevenLabs must be a drop-in fallback —
see [§9 Open Questions](#11-open-questions--verification-before-build) (Higgsfield audio API access
is not yet confirmed for our account).

---

## 2. High-level architecture

```
┌─────────────────┐      JWT / REST       ┌───────────────────────────┐
│  React SPA      │ ───────────────────▶  │  Django + DRF (API)       │
│  (Vite, Vercel) │ ◀─────────────────── │  - auth, projects, assets │
└─────────────────┘   SSE (Prompton)      │  - enqueue gen jobs       │
        ▲                                  │  - credits/billing        │
        │ signed URLs                      └─────────┬─────────────────┘
        │                                            │ enqueue
        │                                  ┌─────────▼─────────┐
┌───────┴────────┐                         │  Redis (broker)   │
│  Object store  │ ◀── download outputs    └─────────┬─────────┘
│  S3 / R2       │                                   │
└────────────────┘                         ┌─────────▼─────────────────┐
        ▲                                   │  Celery workers           │
        │ store results                     │  - call Higgsfield/Claude │
        └─────────────────────────────────  │  - poll / await webhook   │
                                            │  - copy outputs to store  │
                                            └─────────┬─────────────────┘
                                                      │ HTTPS
                                  ┌───────────────────┼────────────────────┐
                                  ▼                   ▼                    ▼
                            Claude API         Higgsfield API        (ElevenLabs)
                          (Prompton)        (Soul / I2V / Audio)     fallback voice
```

**The single most important rule:** generation calls are **asynchronous and credit-metered**
(a 4K video can take minutes). They run in **Celery workers**, never inside a Django request.
The API only *enqueues* a job and returns a `job_id`; the client polls `GET /jobs/{id}` or
subscribes to status updates.

---

## 3. Tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| API framework | **Django 5 + Django REST Framework** | Mature, batteries-included, admin for ops. |
| Async jobs | **Celery + Redis** | Provider calls are long-running & async. |
| DB | **PostgreSQL** | Relational + JSONB for flexible provider payloads. |
| Object storage | **Cloudflare R2** or **AWS S3** | User uploads + generated media; provider output URLs expire. |
| Auth | **djangorestframework-simplejwt** | Stateless JWT; matches the SPA. |
| Billing | **Stripe** + internal credit ledger | Subscriptions + metered credit spend. |
| Realtime (Prompton) | **SSE** (StreamingHttpResponse) | Token streaming from Claude; simpler than websockets. |
| Frontend | existing **React 19 + Vite SPA** | Already routed; talks to API over JWT. |
| Provider SDKs | `anthropic` (Claude), thin HTTP client for Higgsfield | Higgsfield has no official Python SDK → wrap REST. |

---

## 4. Repository layout

Two top-level apps in one repo (frontend already exists at root `src/`):

```
vidora/
├── src/                      # existing React SPA (frontend)
├── docs/ARCHITECTURE.md      # this file
└── backend/                  # NEW Django project
    ├── manage.py
    ├── vidora/               # settings, celery app, urls
    ├── accounts/             # User, auth, profile
    ├── billing/              # Subscription, CreditLedger, Stripe webhooks
    ├── studio/               # Project, Asset, Character, Voice
    ├── generation/           # GenerationJob + Celery tasks + state machine
    ├── prompton/             # Claude assistant (SSE) + Conversation/Message
    └── providers/            # provider abstraction layer (see §6)
        ├── base.py           # interfaces
        ├── claude.py
        ├── higgsfield.py     # image (Soul), video (I2V), audio
        └── elevenlabs.py     # voice fallback
```

---

## 5. Data model (core entities)

Sketch — field types abbreviated. All tables have `id (uuid)`, `created_at`, `updated_at`.

```
User (accounts)
  email, password, display_name, avatar_url
  → has one Subscription, one CreditBalance

Subscription (billing)
  user, stripe_customer_id, stripe_subscription_id
  plan (starter|creator|pro), status, current_period_end

CreditLedger (billing)            # append-only; balance = SUM(delta)
  user, delta (+/- int), reason, ref_job_id, created_at
  # +credits on purchase/renewal, -credits on each generation

Project (studio)                  # a workspace / "board"
  user, title, kind (image|video|voice|mixed)

Asset (studio)                    # any uploaded or generated media
  project, user, type (image|video|audio)
  source (upload|generated), storage_key, url, mime, width, height, duration_ms
  job (nullable → the GenerationJob that produced it)

Character (studio)                # Higgsfield Soul Character (reusable identity)
  user, name, provider_character_id (Soul ID), training_asset_ids[], status

Voice (studio)                    # cloned voice
  user, name, provider (higgsfield|elevenlabs), provider_voice_id, status

GenerationJob (generation)        # the heart of the system — see §7
  user, project, kind (image|video|tts|voice_clone|lipsync)
  provider (higgsfield|claude|elevenlabs), provider_job_id
  status (queued|submitted|processing|succeeded|failed|canceled)
  input_params (jsonb)            # prompt, images_list, character_id, model, etc.
  output_asset_ids[] (nullable)
  credits_cost, error (nullable), attempts
  submitted_at, completed_at

Conversation / Message (prompton) # Claude chat for prompts/scripts
  conversation: user, project, title
  message: conversation, role (user|assistant), content, tokens
```

---

## 6. Provider abstraction layer

All external AI is hidden behind interfaces so we can swap vendors (critical for voice).

```python
# providers/base.py  (sketch)

class ImageProvider(Protocol):
    def create_character(self, images: list[str], name: str) -> CharacterRef: ...
    def generate_image(self, prompt: str, *, references: list[str] = [],
                       character_id: str | None = None, **opts) -> ProviderJob: ...

class VideoProvider(Protocol):
    def image_to_video(self, prompt: str, images_list: list[str],
                       model: str, **opts) -> ProviderJob: ...

class VoiceProvider(Protocol):
    def clone_voice(self, samples: list[str], name: str) -> VoiceRef: ...
    def tts(self, text: str, voice_id: str, **opts) -> ProviderJob: ...
    def lipsync(self, video_url: str, audio_url: str) -> ProviderJob: ...

class AssistantProvider(Protocol):
    def stream_chat(self, messages, system, tools=None) -> Iterator[str]: ...
```

Implementations:
- `providers/claude.py` → `AssistantProvider` (uses `anthropic` SDK, **prompt caching** on the
  system prompt, **streaming**, optional **structured output** to emit Higgsfield-ready params).
- `providers/higgsfield.py` → `ImageProvider` (Soul), `VideoProvider` (I2V), `VoiceProvider`
  (Audio). Thin REST client: `POST /v1/generations` → `{provider_job_id}`; status via
  `GET /v1/generations/{id}`; bearer-token auth.
- `providers/elevenlabs.py` → `VoiceProvider` fallback.

`ProviderJob` = `{ provider_job_id, status }` — normalized so the Celery layer treats every
provider identically.

---

## 7. Generation job lifecycle (the engine)

Every generation is a row in `GenerationJob` plus a Celery task. State machine:

```
queued ──enqueue──▶ submitted ──poll──▶ processing ──poll──▶ succeeded
   │                    │                                       │
   │                    └────────────── failed ◀────────────────┘
   └─▶ (credit check fails) ─▶ failed
```

**Flow (image/video/tts):**

1. **API request** (`POST /generations`): validate params → **check credit balance** →
   create `GenerationJob(status=queued)` → debit credits *provisionally* (reserve) →
   `dispatch_generation.delay(job_id)` → return `{job_id}` (HTTP 202).
2. **Celery task `dispatch_generation`:** call provider (`higgsfield.generate_image(...)`),
   store `provider_job_id`, set `submitted`.
3. **Polling** (`poll_generation` on a countdown, exponential backoff) **or webhook**
   (`POST /webhooks/higgsfield`) flips the job to `processing` / `succeeded` / `failed`.
4. **On success:** **download the output and copy it into our R2/S3** (provider URLs expire),
   create `Asset` rows, attach `output_asset_ids`, finalize credit debit.
5. **On failure:** **refund reserved credits**, store `error`, set `failed`.

**Idempotency:** webhook handler keyed on `provider_job_id`; safe to receive duplicates.
**Concurrency:** per-user job cap + global semaphore to respect Higgsfield rate limits.
**Retries:** network/5xx retried with backoff; provider "content rejected" is terminal.

**Prompton is different** — it's interactive, not a batch job: `POST /prompton/stream` returns
an **SSE** stream straight from Claude (no Celery), persisting the final message at stream end.

---

## 8. Feature flows

### 8.1 Prompton (Claude)
- `POST /prompton/conversations` → start; `POST /prompton/{id}/stream` → SSE token stream.
- System prompt (cached) defines it as a creative director that outputs **scripts** and
  **generation-ready prompts**. Optional tool/structured output: a "make this an image job"
  action returns a JSON block the frontend can hand straight to the image endpoint.

### 8.2 Image generation (Higgsfield Soul)
- **Plain:** `generate_image(prompt, references=[urls], model)` — references = style/composition.
- **Character-consistent:** first `create_character(images[1..5])` → `Character.provider_character_id`,
  then `generate_image(prompt, character_id=...)`. Multiple references = the 1–5 training images.
- Params worth exposing: `custom_reference_id` + `custom_reference_strength`, `seed`.

### 8.3 Video generation (Higgsfield I2V)
- **Multi-reference** via `images_list` (array). Choose a model that supports it:
  **Seedance 2.0 (up to 9 imgs)**, Sora 2/2 Pro, Pixverse v4.5/v5, Vidu. Single-image models
  use `image_url` instead — the provider layer picks the right field per model.
- Params: `motion` preset (Dop), `camera_fixed`, duration, resolution.

### 8.4 Voice cloning → auto voiceover (Higgsfield Audio, Phase 2)
1. `clone_voice(samples)` → `Voice.provider_voice_id`.
2. `tts(script, voice_id)` → audio Asset. (Script can come from Prompton.)
3. `lipsync(video_url, audio_url)` → final video with the cloned voiceover.
- Built behind `VoiceProvider`; if Higgsfield audio isn't API-exposed for us, the same calls
  route to `elevenlabs.py` for steps 1–2 and Higgsfield only does step 3 (lipsync).

---

## 9. Public API surface (REST, JWT-protected)

```
POST   /auth/register, /auth/login, /auth/refresh
GET    /me                                  → profile + credit balance + plan

GET    /projects, POST /projects
GET    /projects/{id}/assets

POST   /generations                         → 202 {job_id}   (kind=image|video|tts|lipsync)
GET    /generations/{id}                     → status + output assets
DELETE /generations/{id}                     → cancel

POST   /characters                          → train Soul character (1–5 images)
GET    /characters
POST   /voices                              → clone voice (Phase 2)

POST   /prompton/conversations
POST   /prompton/{id}/stream                → SSE token stream

POST   /webhooks/higgsfield                 → provider callbacks (signed)
POST   /webhooks/stripe                     → billing events
GET    /uploads/sign                        → presigned PUT for direct-to-storage uploads
```

---

## 10. Cross-cutting concerns

- **Media handling:** clients upload directly to R2/S3 via **presigned URLs** (keeps large files
  off Django). All provider outputs are **re-hosted** in our bucket; we never depend on
  expiring provider URLs. Serve via signed GET URLs / CDN.
- **Billing & credits:** Stripe subscriptions map to monthly credit grants written to
  `CreditLedger`. Each generation reserves → debits (or refunds on failure). Balance is a
  ledger sum (auditable). Plans mirror the UI: Starter $29 / Creator $97 / Pro $199.
- **Secrets:** `ANTHROPIC_API_KEY`, `HIGGSFIELD_API_KEY`, `ELEVENLABS_API_KEY`, Stripe keys —
  env/secret manager, never in the repo. (The current Vite `process.env.GEMINI_API_KEY` define
  is legacy from the AI-Studio scaffold and should be removed.)
- **Security:** JWT auth, per-user rate limits, validate/scan uploads, sign provider webhooks,
  CORS locked to the SPA origin.
- **Observability:** structured logs per job, Sentry, a Celery dashboard (Flower), and a
  `GenerationJob` admin view for support.

---

## 11. Open questions / verification before build

1. **Higgsfield Audio API access** — confirm in the `cloud.higgsfield.ai` console that voice
   clone + TTS are exposed to our account via REST (not only the web app / MCP). If not, voice
   steps 1–2 fall back to ElevenLabs. **Do this before Phase 2.**
2. **Webhooks vs polling** — confirm whether Higgsfield supports completion webhooks; if not,
   the Celery polling path is the default (already designed for it).
3. **Model selection** — decide the default I2V model (Seedance 2.0 for multi-ref is the
   leading candidate) and the Soul image model/version.
4. **Credit economics** — map each provider call's credit cost to our plan pricing before launch.

---

## 12. Phased roadmap

- **Phase 0 — Foundation:** Django+DRF+Celery+Postgres+R2 skeleton, JWT auth, presigned uploads,
  `GenerationJob` engine with one provider wired (Soul image gen) end-to-end. Connect the SPA.
- **Phase 1 — MVP:** Prompton (Claude SSE), image gen (Soul + characters), video gen (I2V
  multi-ref), Stripe credits & plans, history/logs.
- **Phase 2 — Voice:** voice cloning + TTS (Higgsfield Audio or ElevenLabs) + lipsync auto-voiceover.
- **Phase 3 — Editor:** in-app timeline rendered server-side via **Remotion** (Celery render
  workers), so creators finish without leaving for CapCut.
```
