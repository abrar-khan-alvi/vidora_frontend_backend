"""FFmpeg engine for the video editor (multi-clip join + trim + voiceover).

Higgsfield/ElevenLabs generate media; FFmpeg is the local processing engine that
cuts, joins, and re-muxes it. We shell out to the `ffmpeg`/`ffprobe` binaries
(installed in the image) rather than pulling in a Python wrapper — the command
surface is small and explicit.

The editor builds one output from a sequence of clips:
  1. Trim each clip to its in/out range and normalize it (same resolution, fps,
     pixel format, and an audio track — silent if the clip had none) so they can
     be joined cleanly.
  2. Concatenate the normalized clips in order.
  3. Optionally lay a voiceover over the joined video — replace the original
     audio, mix on top of it, or keep the original untouched.

Output is always H.264/AAC + faststart so it plays everywhere and seeks
instantly in the browser.
"""
import os
import subprocess

TARGET_FPS = 30


def _run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if proc.returncode != 0:
        # ffmpeg's useful diagnostics are at the tail of stderr.
        raise RuntimeError(f"ffmpeg failed: {(proc.stderr or '')[-800:]}")


def has_audio_stream(path: str) -> bool:
    """True if `path` contains at least one audio stream (via ffprobe)."""
    try:
        out = subprocess.run(
            [
                "ffprobe", "-v", "error", "-select_streams", "a",
                "-show_entries", "stream=index", "-of", "csv=p=0", path,
            ],
            capture_output=True, text=True, timeout=60,
        )
        return bool(out.stdout.strip())
    except Exception:
        return False


def probe_duration(path: str) -> float | None:
    """Container duration in seconds, or None if it can't be read."""
    try:
        out = subprocess.run(
            [
                "ffprobe", "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", path,
            ],
            capture_output=True, text=True, timeout=60,
        )
        return float(out.stdout.strip())
    except Exception:
        return None


def probe_dimensions(path: str) -> tuple[int, int] | None:
    """(width, height) of the first video stream, or None."""
    try:
        out = subprocess.run(
            [
                "ffprobe", "-v", "error", "-select_streams", "v:0",
                "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", path,
            ],
            capture_output=True, text=True, timeout=60,
        )
        w, h = out.stdout.strip().split("x")
        return int(w), int(h)
    except Exception:
        return None


def extract_last_frame(video_path: str, out_image_path: str) -> None:
    """Write the final frame of a video to an image file.

    Used by DoP auto-extend: the last frame of one ~5s segment becomes the start
    frame of the next, so the chained segments flow continuously. Reading the last
    second with `-update 1` (each decoded frame overwrites the file) leaves the
    very last frame on disk.
    """
    _run([
        "ffmpeg", "-y", "-sseof", "-1", "-i", video_path,
        "-update", "1", "-q:v", "2", out_image_path,
    ])


def _encode_clip(src: str, start: float, end: float | None, tw: int, th: int, out: str) -> None:
    """Trim `src` to [start, end] and normalize to tw×th / TARGET_FPS with an
    audio track (silent if the source had none), so clips can be concatenated."""
    start = max(0.0, float(start or 0.0))
    has_a = has_audio_stream(src)

    cmd = ["ffmpeg", "-y", "-ss", f"{start:.3f}"]
    if end is not None and float(end) > start:
        cmd += ["-t", f"{float(end) - start:.3f}"]
    cmd += ["-i", src]
    if not has_a:
        # A silent stereo track; -shortest below trims it to the video length.
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]

    # Letterbox/pillarbox each clip into a common canvas so differing aspect
    # ratios join without distortion.
    vf = (
        f"scale={tw}:{th}:force_original_aspect_ratio=decrease,"
        f"pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={TARGET_FPS}"
    )
    cmd += ["-vf", vf]
    if has_a:
        cmd += ["-map", "0:v:0", "-map", "0:a:0"]
    else:
        cmd += ["-map", "0:v:0", "-map", "1:a:0", "-shortest"]
    cmd += [
        "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-r", str(TARGET_FPS), out,
    ]
    _run(cmd)


def _concat(paths: list[str], out: str, workdir: str) -> None:
    """Join already-normalized clips with the concat demuxer (stream copy)."""
    listfile = os.path.join(workdir, "concat.txt")
    with open(listfile, "w") as f:
        for p in paths:
            # Single-quote and escape for the concat list format.
            safe = p.replace("'", "'\\''")
            f.write(f"file '{safe}'\n")
    _run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listfile,
        "-c", "copy", "-movflags", "+faststart", out,
    ])


def _mix_audio(
    video_path: str, output_path: str, *,
    voiceover_path: str | None, vo_mode: str, vo_offset: float,
    layers: list[dict], original_volume: float,
) -> None:
    """Mix the final audio over an already-rendered video (video stream copied).

    Combines, as needed:
      - the original audio (kept at full volume, ducked under a "mix" voiceover,
        or dropped under a "replace" voiceover),
      - the voiceover (delayed by `vo_offset`),
      - any music/SFX `layers` ({path, offset, volume}) — e.g. a ducked music bed
        (offset 0) or short sound effects placed at an offset.
    A silent bed (anullsrc) guarantees the audio is at least video-length, and
    `-shortest` then clamps the whole output to the video's length.
    """
    src_has_audio = has_audio_stream(video_path)
    use_vo = bool(voiceover_path) and vo_mode in ("replace", "mix")

    inputs: list[str] = ["-i", video_path]
    idx = 1
    vo_idx = None
    if use_vo:
        inputs += ["-i", voiceover_path]
        vo_idx = idx
        idx += 1
    layer_idx: list[tuple[int, dict]] = []
    for L in layers:
        inputs += ["-i", L["path"]]
        layer_idx.append((idx, L))
        idx += 1
    inputs += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
    bed_idx = idx

    filt: list[str] = []
    parts: list[str] = []

    # Original audio contribution.
    if src_has_audio and (not use_vo or vo_mode == "mix"):
        ov = original_volume if (use_vo and vo_mode == "mix") else 1.0
        filt.append(f"[0:a]volume={ov}[oa]")
        parts.append("[oa]")
    # Voiceover.
    if vo_idx is not None:
        d = int(max(0.0, vo_offset) * 1000)
        pre = f"adelay={d}:all=1," if d > 0 else ""
        filt.append(f"[{vo_idx}:a]{pre}apad[vo]")
        parts.append("[vo]")
    # Music / SFX layers.
    for n, (i, L) in enumerate(layer_idx):
        d = int(max(0.0, float(L.get("offset", 0.0))) * 1000)
        vol = float(L.get("volume", 0.5))
        pre = f"adelay={d}:all=1," if d > 0 else ""
        filt.append(f"[{i}:a]{pre}volume={vol}[l{n}]")
        parts.append(f"[l{n}]")
    # Silent length-guarantee bed.
    parts.append(f"[{bed_idx}:a]")

    filt.append(
        f"{''.join(parts)}amix=inputs={len(parts)}:duration=longest:dropout_transition=0:normalize=0[aout]"
    )

    cmd = ["ffmpeg", "-y"] + inputs + [
        "-filter_complex", ";".join(filt),
        "-map", "0:v:0", "-map", "[aout]", "-shortest",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output_path,
    ]
    _run(cmd)


def render_edit(
    *,
    clips: list[dict],
    output_path: str,
    workdir: str,
    voiceover_path: str | None = None,
    vo_mode: str = "keep",
    vo_offset: float = 0.0,
    layers: list[dict] | None = None,
    original_volume: float = 0.3,
) -> str:
    """Render a sequence of clips into one MP4.

    clips: ordered list of {"path": str, "start": float, "end": float|None}.
    vo_mode: "keep" (original audio), "replace", or "mix".
    vo_offset: seconds into the joined video where the voiceover begins.
    layers: optional music/SFX audio layers [{path, offset, volume}], mixed in.
    """
    layers = layers or []
    if not clips:
        raise RuntimeError("No clips to render.")

    dims = probe_dimensions(clips[0]["path"]) or (1080, 1920)
    tw, th = dims[0] - (dims[0] % 2), dims[1] - (dims[1] % 2)  # libx264 needs even dims

    encoded: list[str] = []
    for i, c in enumerate(clips):
        out = os.path.join(workdir, f"clip_{i}.mp4")
        _encode_clip(c["path"], c.get("start", 0.0), c.get("end"), tw, th, out)
        encoded.append(out)

    joined = encoded[0] if len(encoded) == 1 else os.path.join(workdir, "joined.mp4")
    if len(encoded) > 1:
        _concat(encoded, joined, workdir)

    use_vo = bool(voiceover_path) and vo_mode in ("replace", "mix")
    if not use_vo and not layers:
        # No added audio — just ensure faststart for instant web playback.
        _run(["ffmpeg", "-y", "-i", joined, "-c", "copy", "-movflags", "+faststart", output_path])
    else:
        _mix_audio(
            joined, output_path,
            voiceover_path=voiceover_path, vo_mode=vo_mode, vo_offset=vo_offset,
            layers=layers, original_volume=original_volume,
        )
    return output_path
