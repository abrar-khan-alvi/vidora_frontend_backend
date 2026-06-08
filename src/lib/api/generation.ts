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

export interface CreateUGCParams {
  /** Avatar image Asset id (uploaded or picked). */
  image: string;
  /** The script to be spoken. */
  text: string;
  /** A ready cloned Voice id… */
  voice?: string | null;
  /** …or a built-in ElevenLabs stock voice id. */
  stock_voice_id?: string | null;
  /** Higgsfield Speak `prompt` — the scene/expression description. */
  scenario?: string;
  quality?: 'high' | 'mid';
  duration?: 5 | 10 | 15;
  seed?: number | null;
  enhance_prompt?: boolean;
}

export interface CreateTTSParams {
  /** A ready cloned Voice id to speak in. */
  voice?: string | null;
  /** Or a built-in ElevenLabs stock voice id. */
  stock_voice_id?: string | null;
  text: string;
}

export const generationApi = {
  createImage: (params: CreateImageParams) =>
    apiFetch<GenerationJob>('/generations/', { method: 'POST', auth: true, body: params }),
  createVideo: (params: CreateVideoParams) =>
    apiFetch<GenerationJob>('/generations/video/', { method: 'POST', auth: true, body: params }),
  createUGC: (params: CreateUGCParams) =>
    apiFetch<GenerationJob>('/generations/ugc/', { method: 'POST', auth: true, body: params }),
  createTTS: (params: CreateTTSParams) =>
    apiFetch<GenerationJob>('/generations/tts/', { method: 'POST', auth: true, body: params }),
  get: (id: string) => apiFetch<GenerationJob>(`/generations/${id}/`, { auth: true }),
  list: () => apiFetch<GenerationJob[]>('/generations/?kind=image', { auth: true }),
  listAll: () => apiFetch<GenerationJob[]>('/generations/', { auth: true }),
  listVideos: () => apiFetch<GenerationJob[]>('/generations/?kind=video', { auth: true }),
  listUGC: () => apiFetch<GenerationJob[]>('/generations/?kind=ugc', { auth: true }),
  listAudio: () => apiFetch<GenerationJob[]>('/generations/?kind=audio', { auth: true }),
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
