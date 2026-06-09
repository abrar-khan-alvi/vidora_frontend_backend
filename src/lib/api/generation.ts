import { apiFetch } from './client';

export interface GenAsset {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
}

export type JobStatus =
  | 'queued' | 'submitted' | 'processing' | 'succeeded' | 'failed' | 'canceled';

export interface GenerationJob {
  id: string;
  kind: string;
  status: JobStatus;
  prompt: string;
  outputs: GenAsset[];
  error: string;
  credits_cost: number;
  created_at: string;
  completed_at: string | null;
  input_params?: any;
  /** The start/end frames a video job used — lets a past job be re-run. */
  source_frame?: GenAsset | null;
  end_frame?: GenAsset | null;
}

export interface CreateImageParams {
  prompt: string;
  aspect?: string;
  num_outputs?: number;
  seed?: number | null;
  /** A trained reference (Character) id — the subject (Soul custom_reference_id). */
  reference?: string | null;
  reference_strength?: number;
  /** A built-in Soul style preset id — the look (Soul style_id). */
  style?: string | null;
  style_strength?: number;
}

/** A built-in Higgsfield Soul style preset (the "look"). */
export interface StylePreset {
  id: string;
  name: string;
  description: string;
  preview_url: string;
}

export interface CreateVideoParams {
  prompt?: string;
  source?: string | null;
  end_frame?: string | null;
  quality?: string | null;
  seed?: number | null;
  model_type?: 'dop' | 'seedance' | 'kling';
  /** DoP segments chained into one clip (1≈5s, 2≈10s, 3≈15s, 4≈20s). */
  segments?: number;
  motion_id?: string | null;
  motion_strength?: number | null;
  resolution?: string | null;
  aspect_ratio?: string | null;
  duration?: number | null;
  model?: string | null;
  negative_prompt?: string | null;
  enhance_prompt?: boolean;
  check_nsfw?: boolean;
}

export interface CreateTTSParams {
  /** A ready cloned Voice id to speak in. */
  voice?: string | null;
  /** Or a built-in ElevenLabs stock voice id. */
  stock_voice_id?: string | null;
  text: string;
}

export interface EditClipInput {
  /** A video Asset id. */
  source: string;
  trim_start?: number;
  /** null → trim to the end of the clip. */
  trim_end?: number | null;
}

/** A music/SFX audio Asset mixed under the video at an offset + volume. */
export interface AudioLayerInput {
  source: string;
  offset?: number;
  volume?: number;
}

export interface CreateEditParams {
  /** Ordered clips to trim and join into one video. */
  clips: EditClipInput[];
  /** An audio Asset id to lay over the joined video. */
  voiceover?: string | null;
  voiceover_mode?: 'keep' | 'replace' | 'mix';
  /** Seconds into the joined video where the voiceover starts. */
  voiceover_offset?: number;
  /** Music/SFX layers mixed under the video. */
  audio_layers?: AudioLayerInput[];
}

export interface CreateAudioFxParams {
  audio_type: 'music' | 'sfx';
  prompt: string;
  /** Seconds — music length or SFX duration (optional). */
  length?: number | null;
}

/** An AI-decided sound effect: what it is + where it should land (seconds). */
export interface SuggestedSfx {
  description: string;
  at: number;
}

/** The AI's audio plan for a video: one music bed + 0-3 placed sound effects. */
export interface AudioSuggestion {
  music: string;
  sfx: SuggestedSfx[];
}

export const generationApi = {
  createImage: (params: CreateImageParams) =>
    apiFetch<GenerationJob>('/generations/', { method: 'POST', auth: true, body: params }),
  createVideo: (params: CreateVideoParams) =>
    apiFetch<GenerationJob>('/generations/video/', { method: 'POST', auth: true, body: params }),
  createTTS: (params: CreateTTSParams) =>
    apiFetch<GenerationJob>('/generations/tts/', { method: 'POST', auth: true, body: params }),
  createEdit: (params: CreateEditParams) =>
    apiFetch<GenerationJob>('/generations/edit/', { method: 'POST', auth: true, body: params }),
  createAudioFx: (params: CreateAudioFxParams) =>
    apiFetch<GenerationJob>('/generations/audio/', { method: 'POST', auth: true, body: params }),
  /** Let the AI decide a fitting music bed + sound effects from a video brief. */
  suggestAudio: (brief: string, duration?: number | null) =>
    apiFetch<AudioSuggestion>('/generations/audio/suggest/', {
      method: 'POST', auth: true, body: { brief, duration },
    }),
  get: (id: string) => apiFetch<GenerationJob>(`/generations/${id}/`, { auth: true }),
  /** Delete a finished/failed job (cancels it first if still running). */
  remove: (id: string) => apiFetch<void>(`/generations/${id}/`, { method: 'DELETE', auth: true }),
  list: () => apiFetch<GenerationJob[]>('/generations/?kind=image', { auth: true }),
  listAll: () => apiFetch<GenerationJob[]>('/generations/', { auth: true }),
  listVideos: () => apiFetch<GenerationJob[]>('/generations/?kind=video', { auth: true }),
  listAudio: () => apiFetch<GenerationJob[]>('/generations/?kind=audio', { auth: true }),
  listEdits: () => apiFetch<GenerationJob[]>('/generations/?kind=edit', { auth: true }),
  listStyles: () => apiFetch<StylePreset[]>('/generations/styles/', { auth: true }),
  /** Draft a motion (video) prompt from a still-image prompt — for image → video. */
  suggestMotionPrompt: (image_prompt: string) =>
    apiFetch<{ prompt: string }>('/generations/motion-prompt/', {
      method: 'POST', auth: true, body: { image_prompt },
    }),
};

const TERMINAL: JobStatus[] = ['succeeded', 'failed', 'canceled'];

/** Poll a job every `intervalMs` until it reaches a terminal state. */
export async function pollJob(
  id: string,
  onUpdate: (job: GenerationJob) => void,
  intervalMs = 2000,
): Promise<GenerationJob> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = await generationApi.get(id);
    onUpdate(job);
    if (TERMINAL.includes(job.status)) return job;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
