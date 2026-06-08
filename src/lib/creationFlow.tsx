import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * CreationFlow — the spine of the "ecosystem" loop (assistant → image → video).
 *
 * One step hands work to the next by stashing a small payload here and
 * navigating to the target tab. The target page reads (and clears) the payload
 * on mount via `consumeImage` / `consumeVideo`. The payload lives in a ref on the
 * provider — which sits above the routed tabs in DashboardScreen, so it survives
 * the navigation that mounts the destination page.
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

interface CreationFlowValue {
  startImage: (handoff: ImageHandoff) => void;
  startVideo: (handoff: VideoHandoff) => void;
  consumeImage: () => ImageHandoff | null;
  consumeVideo: () => VideoHandoff | null;
}

const CreationFlowContext = createContext<CreationFlowValue | null>(null);

export function CreationFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const imageRef = useRef<ImageHandoff | null>(null);
  const videoRef = useRef<VideoHandoff | null>(null);

  const startImage = useCallback((handoff: ImageHandoff) => {
    imageRef.current = handoff;
    navigate('/dashboard/image-generation');
  }, [navigate]);

  const startVideo = useCallback((handoff: VideoHandoff) => {
    videoRef.current = handoff;
    navigate('/dashboard/video-generation');
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

  const value = useMemo(
    () => ({ startImage, startVideo, consumeImage, consumeVideo }),
    [startImage, startVideo, consumeImage, consumeVideo],
  );

  return <CreationFlowContext.Provider value={value}>{children}</CreationFlowContext.Provider>;
}

export function useCreationFlow(): CreationFlowValue {
  const ctx = useContext(CreationFlowContext);
  if (!ctx) throw new Error('useCreationFlow must be used within a CreationFlowProvider');
  return ctx;
}
