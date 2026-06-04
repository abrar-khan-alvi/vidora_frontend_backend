# VoiceSync AI (Voice Cloning) — Implementation Plan

**Feature:** Clone a voice from a short audio sample, then generate speech (TTS) in that voice
from any text. Cloned voices are saved and reusable (like the image reference library).

---

## 0. Critical finding — Higgsfield can't do this (verified live 2026-06-04)

I probed the Higgsfield platform API for voice/TTS/cloning. **None of it is available on our API key:**

- Every TTS / voice-clone slug (`higgsfield-ai/speech`, `…/tts`, `…/voice-clone`, `minimax/speech-02`,
  `elevenlabs/tts`, etc.) → **404 "Model not found"**.
- There is **no audio guide** in the Higgsfield API docs (only image + video).
- The only audio-adjacent model that exists is **`higgsfield-ai/speak`** — but it requires
  `image_url` + **`audio_url`** + `prompt`. It's a **lip-sync / talking-avatar** model: you *supply*
  the audio and an image, and it makes the image talk. It does **not** clone or synthesize voice.

Higgsfield *Audio* (TTS + cloning) exists as a **web product**, but it is not exposed to our developer
API key. So voice cloning must come from a **dedicated voice provider**.

---

## 1. Recommended provider — ElevenLabs

ElevenLabs is the industry standard for voice-cloning + TTS APIs and maps perfectly to this feature:

| Need | ElevenLabs endpoint |
|---|---|
| Clone a voice from a sample | `POST /v1/voices/add` (multipart: `name`, `files[]`) → returns `voice_id` |
| Generate speech in that voice | `POST /v1/text-to-speech/{voice_id}` (json: `text`, `model_id`) → audio bytes |
| List voices | `GET /v1/voices` |
| Delete a voice | `DELETE /v1/voices/{voice_id}` |

- Auth header: `xi-api-key: <key>`. Base URL `https://api.elevenlabs.io`.
- Default model: `eleven_multilingual_v2` (70+ languages, high quality).
- We'll call it with **raw `httpx`** (already a dependency) to match our minimal provider style — no
  heavy SDK. Lives behind a `providers/elevenlabs.py` abstraction, exactly like `providers/higgsfield.py`.

**Alternatives** (same shape, env-switchable): PlayHT, Cartesia, Resemble AI, MiniMax speech-02.
ElevenLabs is the recommendation for quality + clone simplicity.

**Needed from the client:** an **ElevenLabs API key** (`xi-api-key`). Voice cloning requires a paid tier
(Instant Voice Cloning is on Starter+).

---

## 2. UX

```
VoiceSync AI
 ├─ [ + Clone a voice ]  → upload/record a sample (up to ~2 min) → name it → "Clone"
 ├─ My Voices: grid of saved voices (name, play sample, rename, delete)
 └─ Generate speech:
      [ Voice ▾ ]  [ text… ]  [ Generate ]  → <audio> player + Download
```

Mirrors the image library + create flow we already built:
- **Voices library** = the reusable-reference-library pattern, for voices.
- **Generate speech** = the composer (pick a voice + type text → audio).

---

## 3. Architecture — reuse what exists

| Already built | Reused for voice |
|---|---|
| `providers/` abstraction (higgsfield.py) | new `providers/elevenlabs.py` |
| `GenerationJob` + status state machine | TTS jobs (`kind=audio`) |
| `Asset.Type.AUDIO` | store generated speech + voice samples |
| `CreditLedger` + `COST` | add `COST["voice_clone"]`, `COST["tts"]` |
| Celery `run_*` task pattern | `run_tts_generation` task |
| `Character` model (Soul) | template for a new `Voice` model |
| Library modal + create/list/detail page flow | Voices library + speech composer |

---

## 4. Backend changes

1. **`settings.py`** — `ELEVENLABS_API_KEY`, `ELEVENLABS_TTS_MODEL = "eleven_multilingual_v2"`,
   `ELEVENLABS_BASE_URL`. (Add key to `backend/.env`.)

2. **`providers/elevenlabs.py`** —
   - `clone_voice(name, sample_bytes, mime) -> voice_id` (`POST /v1/voices/add`, multipart).
   - `text_to_speech(voice_id, text, model_id=…) -> bytes` (`POST /v1/text-to-speech/{voice_id}`).
   - `delete_voice(voice_id)`.

3. **`studio/models.py`** — new **`Voice`** model: `user`, `name`, `provider` (`elevenlabs`),
   `provider_voice_id`, `status` (pending/ready/failed), `sample` (FileField — the uploaded clip),
   `error`, `created_at`. (Mirrors `Character`.) + migration.

4. **`Asset`** — already supports `Type.AUDIO`; generated speech is stored as an `Asset` (mp3).
   `_download_asset` gains an `audio` branch (`.mp3`), like the video one.

5. **Voice endpoints** (`studio` app):
   - `POST /api/studio/voices/` — multipart upload (name + sample) → clone → create `Voice` (Celery
     task `run_voice_clone` so a slow clone doesn't block the request, or inline if fast).
   - `GET /api/studio/voices/` — list user's voices.
   - `PATCH/DELETE /api/studio/voices/<id>/` — rename / delete (also deletes at provider).

6. **TTS job** (`generation` app):
   - `CreateTTSJobSerializer` (`voice` UUID, `text`).
   - `TTSGenerationCreateView` → `POST /api/generations/tts/` → `GenerationJob(kind=audio)` →
     `run_tts_generation.delay(...)`.
   - `run_tts_generation`: resolve `Voice.provider_voice_id` → `elevenlabs.text_to_speech` →
     save bytes as `Asset(type=AUDIO)` → record credits. Same failure handling as image/video.

   *(`GenerationJob.kind` already has `audio`? — it has IMAGE/VIDEO; add `AUDIO`. Small migration.)*

## 5. Frontend changes

1. **`src/lib/api/voice.ts`** — `voiceApi` (listVoices, cloneVoice [multipart], rename, remove) +
   `generationApi.createTTS` / `listTTS`.

2. **`src/pages/VoiceSync.tsx`** (the existing stub) — rebuild with the same **list / create / detail**
   flow:
   - **list:** "My Voices" + recent generated audio; "New Speech" button.
   - **create:** pick a voice (or clone a new one via a modal that uploads a sample), type text,
     Generate → `<audio controls>` player + Download.
   - **detail:** a past TTS clip with player + download + "regenerate".
   - A **Clone-voice modal** (upload/record sample → name → clone), analogous to `ReferenceLibraryModal`.

## 6. Credits

Add `COST["voice_clone"]` (one-time per clone) and `COST["tts"]` (per generation) to `credits.py`.

## 7. Bonus pipeline (future) — talking avatars

Because `higgsfield-ai/speak` takes `image_url` + `audio_url`, we can later chain:
**clone voice (ElevenLabs) → TTS → feed the audio + a portrait to Higgsfield Speak → a talking-avatar
video.** A strong differentiator; out of scope for v1 but the pieces line up.

## 8. Decisions / what's needed

1. **Provider** — ElevenLabs (recommended) vs alternative. *Recommend ElevenLabs.*
2. **Client credential** — an **ElevenLabs API key** (paid tier for cloning). Same dev→AWS path:
   build in dev now, key in `.env`, rotate for prod.
3. **Clone latency** — run cloning via Celery (safe) vs inline (simpler). *Recommend Celery* for parity.

## 9. Build order

1. Add `providers/elevenlabs.py` + settings; verify the key live (list voices / a tiny TTS).
2. Backend: `Voice` model + voice endpoints + `run_voice_clone`; TTS job + `run_tts_generation`.
3. Frontend: `voice.ts` + rebuild `VoiceSync.tsx` (list/create/detail) + clone-voice modal.
4. Validate end-to-end (clone → TTS → audio asset) — provably correct, gated only on the API key/credits.
