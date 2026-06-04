# Video Generation — Implementation Plan

**Feature:** Generate a video from **reference image(s) + a prompt** (image-to-video).
The user picks a driving image (the start frame) from the existing reference **library**
(or `@`-mentions it) and describes the motion in the prompt; Higgsfield animates it.

This is the natural next step after image generation and **reuses ~80% of what we already
built** — the async job pipeline, the reference library, Higgsfield upload-hosting, and the
`@`-mention composer.

---

## 1. UX

```
[ Prompt: "slow cinematic push-in, hair moving in the wind" ]
[ Source image: ⊞ pick from library / @mention / upload ]   ← REQUIRED (the frame to animate)
[ Model: DoP ▾ ]  [ Duration: 5s ▾ ]  [ Aspect: 16:9 ▾ ]
                                                   [ Generate video ]

→ queued → processing (≈1–3 min) → <video> player + Download + "Recent videos" grid
```

- **Source (start) image is required** for image-to-video. An **end frame is optional** — the user
  decides per generation: animate from one image, or interpolate from a start frame to an end frame
  (model-dependent; see §8).
- Same library + `@`-mention picker we built for images — relabeled as a **"Start frame"** slot
  (required) and an **"End frame"** slot (optional), each picking one image.

---

## 2. What we already have (reuse, don't rebuild)

| Already built | Reused for video |
|---|---|
| `GenerationJob` with `kind=video` | Job rows, status state machine, history |
| `CreditLedger` + `COST["video"]=5` | Credit accounting |
| `Asset.Type.VIDEO` | Store the output video |
| Celery `run_*` task pattern (`subscribe()` blocks) | New `run_video_generation` task |
| `higgsfield.upload_reference()` → public CloudFront URL | Host the source image for `image_url` |
| Reference library + `ReferenceLibraryModal` + `@`-mention | Source-image picker |
| `pollJob()` + status UI on the frontend | Same polling, longer wait |

**Net new work is small and well-scoped.**

---

## 3. Higgsfield video models (image-to-video)

Endpoint shape is the same `https://platform.higgsfield.ai/{application}` POST. Documented
image-to-video models:

**Verified live (2026-06-04):** Seedance is NOT enabled on this account (404). The enabled
image-to-video models are DoP, Kling v2.1, and Minimax Hailuo. **DoP is the default** — it has
native first-last-frame (start+end) modes, exactly matching the requirement.

| Model (app id) | Notes |
|---|---|
| `higgsfield-ai/dop/<mode>` | **DoP — DEFAULT.** mode ∈ {`lite`,`standard`,`turbo`} and each `<mode>/first-last-frame`. |
| `kling-video/v2.1/{pro,standard,master}/image-to-video` | Kling — enabled; alt option. |
| `minimax/hailuo-02/{standard,pro}/image-to-video` | Minimax Hailuo — enabled; alt option. |

Slug is built as `higgsfield-ai/dop/{quality}` (single frame) or
`higgsfield-ai/dop/{quality}/first-last-frame` (start+end). `quality` default `standard`.

**DoP request body (confirmed via live probes):**
- `image_url` *(required)* — the **start** frame (we upload the library image to Higgsfield first).
- `end_image_url` *(optional)* — the **end** frame; switches the slug to the `…/first-last-frame` mode.
- `prompt` *(optional)* — motion description.
- `seed` *(optional int)*.
- DoP has **no** `duration`/`aspect_ratio` params (fixed/derived) — so v1 drops those selectors;
  we expose a **quality** selector (lite/standard/turbo) instead.

> Exact param names + allowed `duration`/`aspect_ratio` values will be confirmed against the live
> endpoint via free 422 validation probes (the technique we used for Soul) before finalizing the
> provider. Generation itself is still gated on account credits.

Output: the SDK result carries a video URL (shape `videos[].url` / `video.url` / `url` — the
extractor will tolerate variants, like `_extract_urls` does for images).

---

## 4. Backend changes

1. **`settings.py`** — add:
   - `HIGGSFIELD_VIDEO_APP = "higgsfield-ai/dop/preview"` (env-overridable)
   - `HIGGSFIELD_VIDEO_DURATION` default, allowed durations/aspects as needed.

2. **`providers/higgsfield.py`** — add `generate_video(*, image_url, prompt, duration, aspect, seed)`:
   builds the arguments dict, `subscribe(settings.HIGGSFIELD_VIDEO_APP, args)`, returns output URL(s)
   via a `_extract_video_urls()` helper (mirrors `_extract_urls`).

3. **`generation/tasks.py`** — add `run_video_generation(job_id)`:
   - resolve the **source image** (1 reference Asset) → `higgsfield.upload_reference()` → `image_url`
     (reusing the cached `higgsfield_url`).
   - call `generate_video(...)`, then `_download_asset` the result as `Asset(type=VIDEO)`.
   - record `COST["video"]` credits on success. Same failure handling as image.
   - `_download_asset` needs a tiny tweak: pick `.mp4` ext + `Asset.Type.VIDEO` when the job is video.

4. **`generation/serializers.py`** — `CreateVideoJobSerializer`:
   `prompt` (optional), `source` (UUID of the start-frame Asset, **required**),
   `end_frame` (UUID, **optional**), `duration`, `aspect`, `seed`.

5. **`generation/views.py`** — extend `GenerationListCreateView.create` to branch on a `kind`
   (or add a dedicated `POST /api/generations/video/`): build `input_params`, create a
   `kind=video` job, dispatch `run_video_generation.delay(...)`. List already filters by `?kind=video`.

   *(No new model/migration — `GenerationJob`/`Asset` already support video.)*

---

## 5. Frontend changes

1. **`src/lib/api/generation.ts`** — `createVideo({ prompt, source, duration, aspect })`;
   `GenerationJob.outputs` already carries assets (the video URL). Add `kind`-aware helpers.

2. **`src/pages/VideoGeneration.tsx`** — clone `ImageGeneration` and adapt:
   - reuse `ReferenceLibraryModal` + `@`-mention, but as a **single required "Source image"** picker.
   - model + duration + aspect selectors.
   - result renders a `<video controls>` player + Download; "Recent videos" grid uses a `<video>`/poster.

3. Wire the route/sidebar entry for Video Generation (page already exists as a stub per the app shell).

---

## 6. Latency & async handling

Video takes **~1–3 min**, vs seconds for images. Considerations:
- `subscribe()` blocks in the Celery worker — fine, but bump the worker/provider HTTP timeout.
- Frontend `pollJob` interval: keep 2s; the long `processing` state is expected. Show an honest
  "this can take a couple of minutes" hint + progress spinner.
- **Later optimization:** switch from blocking `subscribe()` to `submit()` + Higgsfield **webhooks**
  so workers aren't held for minutes. Out of scope for v1; note it for scale.

---

## 7. Credits

`COST["video"] = 5` already set. On success we record `-5`. (Real enforcement lands with billing.)

---

## 8. Decisions (locked)

1. **Default model — Seedance Pro** (`bytedance/seedance/v1/pro/image-to-video`), env-configurable.
2. **Frames — both, user's choice:** required **start frame** + **optional end frame**. End-frame slot
   shown only for models that support it; exact provider param confirmed via live probes.
3. **Duration** — expose a small set (e.g. 3s / 5s); default to the model's default. *(Confirm allowed
   values live.)*

---

## 9. Build order (phase-by-phase)

1. **Confirm the video model + params live** (free 422 probes) → lock app id + arg names.
2. **Backend:** provider `generate_video` + `run_video_generation` task + serializer/view + settings.
3. **Frontend:** `VideoGeneration.tsx` + `createVideo` API + route.
4. **Validate** the full async path to the credit wall (upload → image_url → video request → poll),
   exactly as we did for image reference mode.

> Same as image gen, the pipeline will be provably correct end-to-end; actual rendered video is gated
> only on the Higgsfield account having credits.
