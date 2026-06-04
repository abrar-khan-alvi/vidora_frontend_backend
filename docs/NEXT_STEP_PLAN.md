# Next Step — Implementation Plan

**Where we are:** Phase 0 auth is done (Django + DRF + JWT, Dockerized) and the React SPA is
wired to it. Provider keys (Anthropic + Higgsfield) are now in `backend/.env`.

**What this plan covers:** the next vertical to build, in two ordered steps. We start with
**Prompton (Claude)** because it needs no new infrastructure and validates the Claude key fast,
then build the **async generation engine + Higgsfield Soul image** which establishes the job
pattern that image/video/voice all reuse.

---

## Step 0 — Validate the keys (½ day)

Before building, prove both keys work and the Higgsfield surface matches our assumptions.

- [ ] Add `anthropic` to `requirements.txt`; one-off script: 1-token Claude call → confirms key + model id.
- [ ] Higgsfield: from the `cloud.higgsfield.ai` console confirm **auth scheme** (key+secret →
      bearer? header names?), the **Soul image** endpoint + params, and the **job status** endpoint.
      Capture a real request/response sample. **This unblocks Step 2.**
- [ ] Record findings in `docs/ARCHITECTURE.md` §11 (replaces the open questions).

**Acceptance:** a Claude call returns text; a documented Higgsfield request shape exists.

---

## Step 1 — Prompton (Claude assistant)  ← recommended immediate next step

A streaming chat that writes prompts/scripts. Independent of Celery/Redis/storage, so it ships fast.

### Backend (`prompton` app)
- [ ] Models: `Conversation(user, title, created_at)`, `Message(conversation, role, content, created_at)`.
- [ ] `providers/claude.py`: `AssistantProvider` using the `anthropic` SDK with
      **streaming** and **prompt caching** on the system prompt. System prompt = "Vidora creative
      director: produce scripts and generation-ready prompts."
- [ ] Endpoints (all JWT-protected):
  - `POST /api/prompton/conversations/` → create, returns id
  - `GET  /api/prompton/conversations/` → list; `GET .../{id}/` → with messages
  - `POST /api/prompton/conversations/{id}/stream/` → body `{content}`; persists the user
        message, **streams** assistant tokens via `StreamingHttpResponse` (SSE), persists the
        final assistant message on completion.
- [ ] Token-usage accounting hook (stub now, bill later).

### Frontend
- [ ] `src/lib/api/prompton.ts` — `createConversation`, `listConversations`, and a `streamMessage`
      helper reading the SSE stream (`fetch` + `ReadableStream` reader; reuse `tokenStorage`).
- [ ] Wire `src/pages/Prompton.tsx` to real state: conversation list, message thread, streaming
      render, "copy as image/video prompt" action that deep-links into those pages later.

**Acceptance:** a logged-in user sends a message and sees a streamed reply that persists across reload.

**Risks:** SSE through any proxy needs buffering off; keep streaming responses uncompressed.

---

## Step 2 — Generation engine + Higgsfield Soul image (the keystone)

Introduces the async job pattern everything else reuses. Bigger, but build it once.

### Infrastructure (docker-compose)
- [ ] Add **Redis** service. Add a **`worker`** service (`celery -A vidora worker`) sharing the
      web image. Add `celery[redis]` to requirements; create `vidora/celery.py`.
- [ ] Dev storage: Django `MEDIA_ROOT` on a mounted volume + `/media/` serving. (R2/S3 swap later.)

### `studio` app
- [ ] Models: `Project(user, title, kind)`, `Asset(project, user, type, source, file/url, meta)`,
      `Character(user, name, provider_character_id, status)` (Soul characters, 1–5 images).
- [ ] Presigned/local upload endpoint for reference images → `Asset`.

### `generation` app (the engine)
- [ ] `GenerationJob(user, project, kind, provider, provider_job_id, status, input_params jsonb,
      output_asset_ids, credits_cost, error, timestamps)` + status state machine
      (`queued→submitted→processing→succeeded/failed`).
- [ ] `providers/base.py` interfaces + `providers/higgsfield.py` (Soul `create_character`,
      `generate_image`, status polling). Normalize to a `ProviderJob`.
- [ ] Celery tasks: `dispatch_generation` (submit) and `poll_generation` (backoff) →
      on success download output → create `Asset` → finalize; on failure refund credits.
- [ ] Endpoints: `POST /api/generations/` (kind=image) → 202 `{job_id}`; `GET /api/generations/{id}/`;
      `POST /api/characters/`.
- [ ] **Credits stub**: reserve on submit, refund on fail (real Stripe ledger comes in the billing phase).

### Frontend
- [ ] `src/lib/api/generation.ts`; wire `src/pages/ImageGeneration.tsx` to create a job, **poll**
      `GET /generations/{id}`, and render the result + variations.

**Acceptance:** prompt (+ optional reference image) → real Higgsfield image returned, stored, shown;
failures refund the credit reservation.

**Risks:** Higgsfield is async + credit-metered — never call it in a request (Celery only); copy
outputs into our storage (provider URLs expire); respect rate limits with a concurrency cap.

---

## Suggested order
1. **Step 0** (validate keys) — blocks everything.
2. **Step 1 Prompton** — fast win, no infra, exercises Claude.
3. **Step 2 generation engine + Soul image** — the reusable async keystone.
4. Then: video gen (`images_list`), voice (Phase 2), billing, editor (Phase 3).
