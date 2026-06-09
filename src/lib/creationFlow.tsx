import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * CreationFlow — the spine of the "ecosystem" loop
 * (assistant → image → video → edit → publish).
 *
 * One step hands work to the next by stashing a small payload here and
 * navigating to the target tab. The target page reads (and clears) the payload
 * on mount via `consumeImage` / `consumeVideo` / `consumeEdit`. Payloads live in
 * refs on the provider — which sits above the routed tabs in DashboardScreen, so
 * they survive the navigation that mounts the destination page.
 *
 * `script` is different: it's a persistent value (not a one-shot handoff) — the
 * assistant drafts a voiceover script and the editor turns it into an AI voice.
 */
export interface ImageHandoff {
  prompt: string;
  aspect?: string;
}

export interface VideoHandoff {
  /** A ready-to-use video/motion prompt (e.g. from the assistant). */
  prompt?: string;
  /** A still-image prompt to auto-draft a motion prompt from (image → video). */
  imagePrompt?: string;
  /** A generated/uploaded Asset id to use as the start frame (image → video). */
  sourceAssetId?: string;
  sourceUrl?: string;
  modelType?: 'dop' | 'seedance' | 'kling';
}

export interface EditHandoff {
  /** A finished video Asset to load as the first clip in the editor. */
  sourceAssetId: string;
  sourceUrl: string;
  name?: string;
}

/** A trained character (SoulId) the creator chose in the assistant to feature. */
export interface ChosenCharacter {
  id: string;
  name: string;
}

interface CreationFlowValue {
  startImage: (handoff: ImageHandoff) => void;
  startVideo: (handoff: VideoHandoff) => void;
  startEdit: (handoff: EditHandoff) => void;
  consumeImage: () => ImageHandoff | null;
  consumeVideo: () => VideoHandoff | null;
  consumeEdit: () => EditHandoff | null;
  /** A voiceover script carried from the assistant to the editor. */
  script: string;
  setScript: (s: string) => void;
  /** A character the creator chose to feature — carried into image generation. */
  character: ChosenCharacter | null;
  setCharacter: (c: ChosenCharacter | null) => void;
  /** A background-music prompt the assistant suggested — used in the editor. */
  musicPrompt: string;
  setMusicPrompt: (s: string) => void;
}

const CreationFlowContext = createContext<CreationFlowValue | null>(null);

export function CreationFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const imageRef = useRef<ImageHandoff | null>(null);
  const videoRef = useRef<VideoHandoff | null>(null);
  const editRef = useRef<EditHandoff | null>(null);
  const [script, setScript] = useState('');
  const [character, setCharacter] = useState<ChosenCharacter | null>(null);
  const [musicPrompt, setMusicPrompt] = useState('');

  const startImage = useCallback((handoff: ImageHandoff) => {
    imageRef.current = handoff;
    navigate('/dashboard/image-generation');
  }, [navigate]);

  const startVideo = useCallback((handoff: VideoHandoff) => {
    videoRef.current = handoff;
    navigate('/dashboard/video-generation');
  }, [navigate]);

  const startEdit = useCallback((handoff: EditHandoff) => {
    editRef.current = handoff;
    navigate('/dashboard/editor');
  }, [navigate]);

  const consumeImage = useCallback(() => {
    const h = imageRef.current;
    imageRef.current = null;
    return h;
  }, []);

  const consumeVideo = useCallback(() => {
    const h = videoRef.current;
    videoRef.current = null;
    return h;
  }, []);

  const consumeEdit = useCallback(() => {
    const h = editRef.current;
    editRef.current = null;
    return h;
  }, []);

  const value = useMemo(
    () => ({
      startImage, startVideo, startEdit,
      consumeImage, consumeVideo, consumeEdit,
      script, setScript,
      character, setCharacter,
      musicPrompt, setMusicPrompt,
    }),
    [startImage, startVideo, startEdit, consumeImage, consumeVideo, consumeEdit, script, character, musicPrompt],
  );

  return <CreationFlowContext.Provider value={value}>{children}</CreationFlowContext.Provider>;
}

export function useCreationFlow(): CreationFlowValue {
  const ctx = useContext(CreationFlowContext);
  if (!ctx) throw new Error('useCreationFlow must be used within a CreationFlowProvider');
  return ctx;
}
