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
}

export interface CreateImageParams {
  prompt: string;
  aspect?: string;
  num_outputs?: number;
  seed?: number | null;
  /** Asset IDs of uploaded reference images (Soul reference mode). */
  references?: string[];
}

export interface CreateVideoParams {
  prompt?: string;
  /** Asset ID of the required start/source frame. */
  source: string;
  /** Asset ID of the optional end frame (switches to first-last-frame mode). */
  end_frame?: string | null;
  quality?: 'lite' | 'standard' | 'turbo';
  seed?: number | null;
}

export const generationApi = {
  createImage: (params: CreateImageParams) =>
    apiFetch<GenerationJob>('/generations/', { method: 'POST', auth: true, body: params }),
  createVideo: (params: CreateVideoParams) =>
    apiFetch<GenerationJob>('/generations/video/', { method: 'POST', auth: true, body: params }),
  get: (id: string) => apiFetch<GenerationJob>(`/generations/${id}/`, { auth: true }),
  list: () => apiFetch<GenerationJob[]>('/generations/?kind=image', { auth: true }),
  listVideos: () => apiFetch<GenerationJob[]>('/generations/?kind=video', { auth: true }),
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
