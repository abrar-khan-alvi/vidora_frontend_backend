# Vidora landing-page showcase assets

Drop real, Vidora-generated media here using the exact filenames below and it
appears on the landing page automatically. **Any missing file falls back to a
branded "preview" placeholder** — never a fake/stock asset — so the page always
looks intentional even before you add media.

The manifest lives in `src/pages/LandingPage.tsx` → the `SHOWCASE` constant.
Change a path there if you want different names.

## Files expected

| Filename                | Type  | Where it shows            | Specs |
|-------------------------|-------|---------------------------|-------|
| `hero.mp4`              | video | Hero (autoplay loop)      | H.264 mp4, 8–15s loop, muted, ≤1080p, **keep ≤4 MB** |
| `hero-poster.jpg`       | image | Hero first frame          | matches hero.mp4, ~1280×720 |
| `demo-1.mp4`            | video | "How it works" strip      | short clip, ≤3 MB |
| `demo-1.jpg`            | image | poster for demo-1.mp4     | ~1024×768 (4:3) |
| `demo-2.jpg`            | image | "How it works" strip      | ~1024×768 (4:3) |
| `demo-3.jpg`            | image | "How it works" strip      | ~1024×768 (4:3) |
| `video-spotlight.mp4`   | video | Video feature spotlight   | 16:9, ≤4 MB |
| `video-spotlight.jpg`   | image | poster for spotlight      | 16:9 ~1280×720 |
| `g-1.jpg`               | image | Gallery                   | ~1024px, square-ish |
| `g-2.mp4` + `g-2.jpg`   | video | Gallery (clip + poster)   | square-ish, ≤3 MB |
| `g-3.jpg`               | image | Gallery                   | ~1024px |
| `g-4.jpg`               | image | Gallery                   | ~1024px |
| `g-5.mp4` + `g-5.jpg`   | video | Gallery (clip + poster)   | ≤3 MB |
| `g-6.jpg`               | image | Gallery                   | ~1024px |
| `g-7.jpg`               | image | Gallery                   | ~1024px |
| `g-8.mp4` + `g-8.jpg`   | video | Gallery (clip + poster)   | ≤3 MB |
| `voice-1.mp3`           | audio | VoiceSync spotlight       | ≤20s, the narrator sample |
| `voice-2.mp3`           | audio | VoiceSync spotlight       | ≤20s, the cloned-voice sample |

## Tips

- **Compress videos.** Hero/gallery videos autoplay; oversized files hurt load
  time. Aim for the sizes above (HandBrake / ffmpeg `-crf 28` works well).
- Prefer `.webp` or optimized `.jpg` for images (smaller than PNG).
- If you change the demo prompt captions or voice scripts, edit them in the
  `SHOWCASE` constant in `src/pages/LandingPage.tsx`.
