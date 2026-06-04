# Image Generation — Implementation Plan

The first **generation** vertical: prompt (+ optional reference images / a reusable character) →
a real image from **Higgsfield Soul**, stored in our bucket and shown in the UI. This slice builds
the **async job engine** (Redis + Celery + `GenerationJob`) that video and voice will reuse, so it
is intentionally bigger than Prompton.

**Prereqs already in place:** auth (JWT), Prompton, `HIGGSFIELD_API_KEY` / `HIGGSFIELD_API_SECRET`
in `backend/.env`. **Not yet validated:** the live Higgsfield Soul API — Step 1 below does that.

---

## 1. Validate the Higgsfield Soul API  ← blocks everything

The exact request shape is still unconfirmed. Pin it down before writing the provider.

- [ ] In the `cloud.higgsfield.ai` console, confirm for our account:
  - **Auth** — how key + secret are sent (e.g. `Authorization: Bearer <key>` + a secret header, or HMAC). Capture the exact header names.
  - **Text-to-image (Soul)** — submit endpoint (`POST /v1/...`), the prompt/style/aspect/seed params, and whether it's async (returns a job id) or sync.
  - **Image reference** — how a reference image URL is passed; the `custom_reference_id` / `custom_reference_strength` params.
  - **Soul Character** — `create_character` (1–5 images → `character_id`) and how `character_id` is passed to a generation.
  - **Status** — `GET /v1/generations/{id}` shape: status values + where the output image URL(s) land.
- [ ] Save one real request+response sample per call into `docs/higgsfield-samples.md`.
- [ ] Make one tiny paid test generation to confirm the full submit→poll→output loop and note the credit cost.

**Output:** a confirmed mini-spec the provider client is built against. If auth/clone turns out
app-only, we still proceed with text-to-image + image-reference (character training can be a follow-up).

---

## 2. Infrastructure — Redis + Celery + media storage

- [ ] `requirements.txt`: add `celery[redis]`.
- [ ] `docker-compose.yml`: add a **`redis`** service (`redis:7`) and a **`worker`** service that
      reuses the web image with command `celery -A vidora worker -l info` (same `.env`, `depends_on: [db, redis]`).
- [ ] `vidora/celery.py`: Celery app reading `CELERY_BROKER_URL` / result backend from env; `vidora/__init__.py` imports it.
- [ ] settings: `CELERY_BROKER_URL=redis://redis:6379/0` (+ result backend), `HIGGSFIELD_*` already present.
- [ ] **Dev storage**: Django `MEDIA_ROOT` on a mounted volume, served at `/media/`. (Swap to
      Cloudflare R2/S3 via `django-storages` later — keep all file access behind `Asset.url`.)

---

## 3. `studio` app — projects, assets, characters

```
Project(user, title, kind="image", created_at)
Asset(
  id uuid, project, user,
  type = "image",
  source = "upload" | "generated",
  file (ImageField → MEDIA) , url (property/serialized),
  width, height, mime, job (nullable → the GenerationJob), created_at,
)
Character(                       # Higgsfield Soul Character (reusable identity)
  id uuid, user, name,
  provider_character_id (nullable), status = "pending|ready|failed",
  training_asset_ids (json), created_at,
)
```

- [ ] Models + migration + admin.
- [ ] **Upload endpoint** `POST /api/studio/assets/` (multipart) → saves an `Asset(source="upload")`
      and returns `{id, url}`. Used for reference images and character training images.
      (Dev: file goes to MEDIA; prod: presigned R2 PUT later.)

---

## 4. `generation` app — the async engine

```
GenerationJob(
  id uuid, user, project,
  kind = "image",
  provider = "higgsfield",
  provider_job_id (nullable),
  status = "queued|submitted|processing|succeeded|failed|canceled",
  input_params (jsonb)            # {prompt, model, references[], character_id, aspect, seed, num_outputs}
  output_asset_ids (json, nullable),
  credits_cost (int, default 0),
  error (text, nullable),
  attempts (int, default 0),
  created_at, submitted_at, completed_at,
)
```

State machine: `queued → submitted → processing → succeeded | failed` (+ `canceled`).

- [ ] Model + migration + admin (read-only inspector for support).
- [ ] **Credits stub** (`billing`-lite for now): a helper that reserves on submit and refunds on
      failure. Back it with a simple `CreditLedger(user, delta, reason, ref_job_id)` append table so
      the real Stripe phase can reuse it. Reservation amount comes from a per-model cost map.

---

## 5. `providers/` layer

```
providers/base.py     # ImageProvider protocol: generate_image(...), create_character(...), poll(provider_job_id)
providers/higgsfield.py
```

- [ ] `higgsfield.py`: thin HTTP client (`httpx`) using the confirmed auth from Step 1.
  - `generate_image(prompt, *, references=[], character_id=None, aspect, seed, num_outputs)` → `provider_job_id`
  - `create_character(image_urls)` → `provider_character_id`
  - `poll(provider_job_id)` → normalized `{status, output_urls[]}`
  - Normalize Higgsfield's fields to our own enums so Celery treats every provider identically.
- [ ] Read keys from settings; never log them.

---

## 6. Celery tasks — the job lifecycle

```
dispatch_generation(job_id):
  job → submitted; call higgsfield.generate_image(**input_params); store provider_job_id
  schedule poll_generation(job_id) with countdown

poll_generation(job_id):
  r = higgsfield.poll(job.provider_job_id)
  processing → re-schedule with backoff (cap attempts)
  succeeded → download each output image, save Asset(source="generated"), attach output_asset_ids,
              finalize credits, status=succeeded, completed_at
  failed    → refund reserved credits, store error, status=failed
```

- [ ] **Always copy outputs into our storage** (provider URLs expire) — download in the worker, save as `Asset`.
- [ ] Backoff + max-attempts guard; mark `failed` with a clear error on timeout.
- [ ] Idempotent on `provider_job_id` (safe re-runs).
- [ ] Per-user concurrency cap to respect Higgsfield rate limits (start simple: a count check before submit).

---

## 7. API surface (JWT-protected)

```
POST   /api/studio/assets/                 → upload reference image (multipart) → {id, url}
POST   /api/studio/characters/             → train a Soul character (1–5 asset ids) → 202 {id}
GET    /api/studio/characters/             → list (with status)

POST   /api/generations/                   → body {prompt, references:[asset_id], character_id?, aspect, seed?, num_outputs}
                                             → 202 {job_id}
GET    /api/generations/{id}/              → {status, output assets:[{id,url}], error}
DELETE /api/generations/{id}/              → cancel (best-effort)
GET    /api/generations/?kind=image        → recent jobs (history)
```

- [ ] Validate inputs; resolve `references` (asset ids → URLs) server-side.
- [ ] On create: credit check → create job (queued) → reserve credits → `dispatch_generation.delay(id)` → 202.

---

## 8. Frontend — wire `src/pages/ImageGeneration.tsx`

- [ ] `src/lib/api/generation.ts`: `uploadAsset(file)`, `createCharacter(assetIds)`, `listCharacters`,
      `createImageJob(params)`, `getJob(id)`, `listJobs()`. Reuse `apiFetch` + token refresh; uploads
      use `FormData` (skip the JSON `Content-Type`).
- [ ] A small `useJobPolling(jobId)` hook: poll `GET /generations/{id}` every ~2s until terminal.
- [ ] UI flow:
  - prompt box (+ a "from Prompton" handoff later),
  - **multi-image reference** uploader (maps to `references[]`),
  - optional **character** picker (and a "create character" mini-flow with 1–5 images),
  - aspect ratio + count, Generate button → shows progress → renders result grid,
  - per-image **download** + **make variation** (re-submit with same params + new seed).
- [ ] Loading/skeleton states and provider-error surfacing.

---

## 9. Acceptance criteria

- A logged-in user uploads 0–N reference images, enters a prompt, clicks Generate, and within the
  provider's time sees a real Higgsfield image rendered and downloadable.
- The output is stored in our MEDIA/bucket (not a raw expiring provider URL).
- A failed generation refunds the reserved credits and shows a clear error.
- History lists past image jobs with their outputs.
- Nothing blocks a Django request thread — all provider work runs in Celery.

---

## 10. Risks & decisions

- **Higgsfield async + credit-metered** — never call it in a request; Celery only. Confirmed in Step 1.
- **Output URLs expire** — re-host every output immediately.
- **Character training may be app-only** over REST — if so, ship text-to-image + image-reference first,
  add characters when the endpoint is confirmed.
- **Polling vs webhooks** — default to polling (designed for it); switch to webhooks if Higgsfield supports them.
- **Storage** — dev uses local MEDIA; production must use R2/S3 before launch (all access already behind `Asset.url`).
- **Cost** — map each Soul model's credit cost into the reservation table before exposing generation to real users.

---

## Build order
1. Step 1 (validate Higgsfield) — blocks all.
2. Steps 2–6 backend engine, tested via curl against a real generation.
3. Step 7 API + Step 8 frontend wiring.
4. Then reuse the same engine for **video** (`images_list`) and **voice** (Phase 2).
