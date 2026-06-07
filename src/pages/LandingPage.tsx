import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useMotionValue, useInView, animate } from 'motion/react';
import {
  PlaySquare, ImagePlus, Mic, Sparkles, LayoutDashboard,
  CheckCircle2, ArrowRight, Play, Pause, Zap, Crown,
  Menu, X, Camera, Cpu, Layers, Wand2, ChevronDown, Volume2,
  Film, Image as ImageIcon,
} from 'lucide-react';

interface LandingPageProps {
  setScreen: (screen: string) => void;
}

/* ──────────────────────────────────────────────────────────────────────────
   SHOWCASE MANIFEST
   Drop real files into `public/showcase/` using these names and they appear
   automatically. Any missing file falls back to a tasteful branded placeholder
   (never a fake/stock asset) — see public/showcase/README.md for specs.
   ────────────────────────────────────────────────────────────────────────── */
const SHOWCASE = {
  hero: { src: '/showcase/hero.mp4', poster: '/showcase/hero-poster.jpg' },
  demos: [
    {
      prompt: 'A cinematic drone shot gliding over misty mountains at sunrise, golden light.',
      src: '/showcase/demo-1.mp4', poster: '/showcase/demo-1.jpg', kind: 'video' as const,
    },
    {
      prompt: 'Editorial portrait of a woman in a neon-lit Tokyo alley, 35mm film look.',
      src: '/showcase/demo-2.jpg', poster: '', kind: 'image' as const,
    },
    {
      prompt: 'Cozy product shot: a ceramic coffee cup on oak, soft morning window light.',
      src: '/showcase/demo-3.jpg', poster: '', kind: 'image' as const,
    },
  ],
  videoClip: { src: '/showcase/video-spotlight.mp4', poster: '/showcase/video-spotlight.jpg' },
  gallery: [
    { src: '/showcase/g-1.jpg', poster: '', kind: 'image' as const, tag: 'Image · Soul style' },
    { src: '/showcase/g-2.mp4', poster: '/showcase/g-2.jpg', kind: 'video' as const, tag: 'Video · DoP' },
    { src: '/showcase/g-3.jpg', poster: '', kind: 'image' as const, tag: 'Image · Reference' },
    { src: '/showcase/g-4.jpg', poster: '', kind: 'image' as const, tag: 'Image · Soul style' },
    { src: '/showcase/g-5.mp4', poster: '/showcase/g-5.jpg', kind: 'video' as const, tag: 'Video · Kling' },
    { src: '/showcase/g-6.jpg', poster: '', kind: 'image' as const, tag: 'Image · Portrait' },
    { src: '/showcase/g-7.jpg', poster: '', kind: 'image' as const, tag: 'Image · Product' },
    { src: '/showcase/g-8.mp4', poster: '/showcase/g-8.jpg', kind: 'video' as const, tag: 'Video · DoP' },
  ],
  voices: [
    { name: 'Narrator', script: '"Here’s how I made a week of content before my coffee got cold."', src: '/showcase/voice-1.mp3' },
    { name: 'Your clone', script: '"This is my own voice — cloned from a 30-second sample."', src: '/showcase/voice-2.mp3' },
  ],
};

const WAVEFORM_PARAMS = Array.from({ length: 28 }, (_, i) => ({
  peak: 12 + (((i * 7 + 3) * 13) % 40),
  duration: 0.7 + (i % 6) * 0.12,
  delay: i * 0.04,
}));

const HERO_PARTICLES = [
  { top: '18%', left: '8%',  size: 4, dur: 7,  del: 0   },
  { top: '28%', left: '88%', size: 3, dur: 9,  del: 1.2 },
  { top: '55%', left: '93%', size: 5, dur: 6,  del: 2.5 },
  { top: '72%', left: '6%',  size: 3, dur: 11, del: 0.7 },
  { top: '42%', left: '96%', size: 4, dur: 8,  del: 3.1 },
  { top: '82%', left: '18%', size: 3, dur: 10, del: 1.8 },
];

/* ── Hooks ─────────────────────────────────────────────────────────────── */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Animation helpers ─────────────────────────────────────────────────── */
interface FadeUpProps { children: React.ReactNode; delay?: number; className?: string; }
const FadeUp: React.FC<FadeUpProps> = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

interface SlideInProps { children: React.ReactNode; direction?: 'left' | 'right'; delay?: number; className?: string; }
const SlideIn: React.FC<SlideInProps> = ({ children, direction = 'left', delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, x: direction === 'left' ? -50 : 50 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

interface StatItemProps { to: number; suffix: string; prefix?: string; label: string; }
const StatItem: React.FC<StatItemProps> = ({ to, suffix, prefix = '', label }) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v: number) => Math.round(v));
  useEffect(() => {
    if (inView) animate(count, to, { duration: 1.6, ease: 'easeOut' });
  }, [inView, count, to]);
  return (
    <div ref={ref} className="flex flex-col items-center text-center">
      <div className="text-[40px] sm:text-[48px] font-black tracking-tight bg-gradient-to-br from-[#9758FF] to-[#c084fc] bg-clip-text text-transparent leading-none mb-2">
        {prefix}<motion.span>{rounded}</motion.span>{suffix}
      </div>
      <div className="text-[13px] text-[#7A7A80] font-medium">{label}</div>
    </div>
  );
};

/* ── Media primitives (graceful fallback, lazy, in-view autoplay) ──────── */
const MediaPlaceholder: React.FC<{ kind?: 'video' | 'image'; label?: string; className?: string }> = ({ kind = 'image', label, className = '' }) => (
  <div className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-[#1A0F2E] via-[#0D0D10] to-[#0A0A0C] border border-white/[0.05] overflow-hidden ${className}`}>
    <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #9758FF 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
    <div className="relative w-12 h-12 rounded-2xl bg-[#9758FF]/12 border border-[#9758FF]/20 flex items-center justify-center mb-3">
      {kind === 'video' ? <Film size={20} className="text-[#9758FF]" /> : <ImageIcon size={20} className="text-[#9758FF]" />}
    </div>
    <div className="relative text-[11px] text-[#7A7A80] font-medium">{label || (kind === 'video' ? 'Video preview' : 'Image preview')}</div>
  </div>
);

const ShowcaseVideo: React.FC<{ src?: string; poster?: string; label?: string; className?: string; rounded?: string }> = ({ src, poster, label, className = '', rounded = 'rounded-2xl' }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(!src);
  const inView = useInView(ref, { amount: 0.35 });
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const v = ref.current;
    if (!v || failed) return;
    if (inView && !reduced) v.play().catch(() => {});
    else v.pause();
  }, [inView, failed, reduced]);

  if (failed) return <MediaPlaceholder kind="video" label={label} className={`${rounded} ${className}`} />;
  return (
    <video
      ref={ref}
      src={src}
      poster={poster || undefined}
      muted loop playsInline preload="none"
      onError={() => setFailed(true)}
      className={`${rounded} object-cover ${className}`}
    />
  );
};

const ShowcaseImage: React.FC<{ src?: string; alt?: string; label?: string; className?: string; rounded?: string }> = ({ src, alt = '', label, className = '', rounded = 'rounded-2xl' }) => {
  const [failed, setFailed] = useState(!src);
  if (failed) return <MediaPlaceholder kind="image" label={label} className={`${rounded} ${className}`} />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`${rounded} object-cover ${className}`} />;
};

/* ── Voice sample player ───────────────────────────────────────────────── */
const VoicePlayer: React.FC<{ voice: { name: string; script: string; src?: string }; active: boolean; accent?: string }> = ({ voice, active, accent = '#10B981' }) => {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(!voice.src);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = ref.current;
    if (!a || failed) return;
    if (playing) a.pause();
    else a.play().catch(() => setFailed(true));
  };

  return (
    <div className={`p-4 rounded-2xl border transition-colors ${active ? 'bg-[#10B981]/[0.06] border-[#10B981]/25' : 'bg-white/[0.02] border-white/[0.05]'}`}>
      <audio
        ref={ref}
        src={voice.src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
      />
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={failed}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: `${accent}1A`, border: `1px solid ${accent}33` }}
          aria-label={playing ? 'Pause sample' : 'Play sample'}
        >
          {playing ? <Pause size={16} style={{ color: accent }} /> : <Play size={16} style={{ color: accent }} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 size={13} style={{ color: accent }} />
            <span className="text-[13px] font-semibold text-white">{voice.name}</span>
            {failed && <span className="text-[10px] text-[#5A5A60]">· sample coming</span>}
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-150" style={{ width: `${progress}%`, backgroundColor: accent }} />
          </div>
        </div>
      </div>
      <p className="text-[12px] text-[#A1A1A5] italic leading-relaxed mt-3">{voice.script}</p>
    </div>
  );
};

/* ── Demo strip: typewriter prompt → result ────────────────────────────── */
const DemoStrip: React.FC = () => {
  const demos = SHOWCASE.demos;
  const reduced = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const demo = demos[idx];

  useEffect(() => {
    if (reduced) { setTyped(demo.prompt); return; }
    setTyped('');
    let i = 0;
    const t = setInterval(() => {
      i++;
      setTyped(demo.prompt.slice(0, i));
      if (i >= demo.prompt.length) clearInterval(t);
    }, 26);
    return () => clearInterval(t);
  }, [idx, demo.prompt, reduced]);

  useEffect(() => {
    const t = setTimeout(() => setIdx((idx + 1) % demos.length), 6500);
    return () => clearTimeout(t);
  }, [idx, demos.length]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center bg-[#0D0D10] border border-white/[0.06] rounded-[28px] p-6 sm:p-8">
      {/* Prompt side */}
      <div className="order-2 lg:order-1">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-[#9758FF]" />
          <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">You type</span>
        </div>
        <div className="bg-[#08080A] border border-white/[0.05] rounded-2xl p-5 min-h-[120px]">
          <p className="text-[15px] text-[#E4E4E8] leading-relaxed font-medium">
            {typed}
            <span className="inline-block w-[2px] h-[18px] align-middle bg-[#9758FF] ml-0.5 animate-pulse" />
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4">
          {demos.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Show example ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-7 bg-[#9758FF]' : 'w-1.5 bg-white/15 hover:bg-white/30'}`}
            />
          ))}
        </div>
      </div>
      {/* Result side */}
      <div className="order-1 lg:order-2">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">Vidora makes</span>
          <span className="text-[10px] text-[#9758FF] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9758FF] animate-pulse" /> in ~60s
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="aspect-[4/3] w-full"
          >
            {demo.kind === 'video'
              ? <ShowcaseVideo src={demo.src} poster={demo.poster} label="Example result" className="w-full h-full" />
              : <ShowcaseImage src={demo.src} alt={demo.prompt} label="Example result" className="w-full h-full" />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── FAQ accordion ─────────────────────────────────────────────────────── */
const FAQItem: React.FC<{ q: string; a: string; open: boolean; onToggle: () => void }> = ({ q, a, open, onToggle }) => (
  <div className="border border-white/[0.06] rounded-2xl bg-[#0D0D10] overflow-hidden">
    <button onClick={onToggle} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left">
      <span className="text-[15px] font-semibold text-white">{q}</span>
      <ChevronDown size={18} className={`text-[#7A7A80] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="px-6 pb-5 text-[14px] text-[#A1A1A5] leading-relaxed">{a}</p>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/* ── Hero showcase (browser chrome + real video) ───────────────────────── */
const HeroShowcase: React.FC = () => (
  <div className="relative w-full max-w-[920px] mx-auto">
    <div className="absolute inset-0 bg-[#9758FF] opacity-[0.08] blur-[100px] rounded-full scale-75 translate-y-8 pointer-events-none" />
    <div className="relative rounded-[20px] border border-white/[0.08] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.9)] bg-[#08080A]">
      <div className="bg-[#0F0F12] border-b border-white/[0.05] px-4 py-3 flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
          <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
          <div className="w-3 h-3 rounded-full bg-[#10B981]/60" />
        </div>
        <div className="flex-1 bg-[#1A1A20] rounded-md px-3 py-1.5 flex items-center justify-center max-w-[240px] mx-auto">
          <span className="text-[11px] text-[#5A5A60]">app.vidora.ai</span>
        </div>
      </div>
      <div className="relative aspect-video">
        <ShowcaseVideo src={SHOWCASE.hero.src} poster={SHOWCASE.hero.poster} label="Made with Vidora" rounded="rounded-none" className="w-full h-full" />
        <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
          <Sparkles size={11} className="text-[#9758FF]" />
          <span className="text-[10px] text-white/90 font-medium">Made with Vidora</span>
        </div>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ setScreen }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [activeVoice, setActiveVoice] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cycle highlight across voice samples for a touch of life.
  useEffect(() => {
    const t = setInterval(() => setActiveVoice((v) => (v + 1) % SHOWCASE.voices.length), 4000);
    return () => clearInterval(t);
  }, []);

  const { scrollYProgress } = useScroll();
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScroll } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const mockupY = useTransform(heroScroll, [0, 1], [0, -50]);

  const features = [
    { icon: PlaySquare, title: 'Video Generation', description: 'One line of text becomes a clip you’d actually post — cinematic motion, lighting, the works.', bullets: ['Text or image → video', 'Up to 4K output', 'Multiple film looks'], color: '#9758FF' },
    { icon: ImagePlus, title: 'Image Generation', description: 'On-brand images in your style on tap — thumbnails, posts, product shots, portraits.', bullets: ['Style presets + references', 'Multiple aspect ratios', 'High-res export'], color: '#3B82F6' },
    { icon: Mic, title: 'VoiceSync', description: 'Turn any script into a clean voiceover — or clone your own voice from a short sample.', bullets: ['Text → speech', 'Clone your voice', 'Studio-quality audio'], color: '#10B981' },
    { icon: Sparkles, title: 'Prompton', description: 'A built-in co-pilot that writes the prompt for you, so your results land on the first try.', bullets: ['Prompt assistance', 'Reusable prompt library', 'One-click refine'], color: '#F59E0B' },
    { icon: LayoutDashboard, title: 'Your Studio', description: 'Everything in one place — history, credits, and a library of every creation you make.', bullets: ['Full generation history', 'Credit tracking', 'Organized media library'], color: '#c084fc' },
  ];

  const plans = [
    {
      name: 'Starter', icon: Zap,
      price: billingAnnual ? 23 : 29,
      description: 'For the creator who just wants clean results, no watermark, no fuss.',
      features: ['10 video generations / mo', 'Unlimited image generations', 'No watermarks', 'Commercial-use license', 'HD export'],
      cta: 'Start with Starter', highlight: false,
    },
    {
      name: 'Creator', icon: Crown,
      price: billingAnnual ? 78 : 97,
      description: 'For creators posting often who need volume, 4K, and the newest models first.',
      features: ['50 video generations / mo', 'Unlimited images + voices', '4K Ultra-HD export', 'Voice cloning', 'Priority rendering', 'Early access to new models'],
      cta: 'Go Creator', highlight: true,
    },
    {
      name: 'Pro', icon: Zap,
      price: billingAnnual ? 159 : 199,
      description: 'For full-time creators and small teams producing at scale every week.',
      features: ['200 4K video generations / mo', 'Everything in Creator', 'Custom character references', 'Priority support', 'Early API access', 'Team seats'],
      cta: 'Get Pro', highlight: false,
    },
  ];

  const faqs = [
    { q: 'Do I own what I create?', a: 'Yes. Everything you generate on a paid plan comes with a commercial-use license — post it, sell it, put it in client work. It’s yours.' },
    { q: 'I’m not technical. Can I still use this?', a: 'That’s exactly who Vidora is for. You type what you want in plain English (Prompton even helps you phrase it), pick a look, and hit generate. No timelines, no editing software, no learning curve.' },
    { q: 'How is this different from using five separate AI tools?', a: 'Video, image, voice, and prompting live in one studio with one login and one bill — and they share your references and history. No exporting between apps, no stacking subscriptions.' },
    { q: 'Is my voice data private?', a: 'Voice cloning uses a sample you upload, only to generate audio for you. We don’t sell or share your voice data, and you can delete a cloned voice at any time.' },
    { q: 'How fast is it, really?', a: 'Most images return in seconds and most videos in around a minute, depending on length and resolution. You’ll see progress live while it renders.' },
    { q: 'What does the free plan include?', a: '3 free generations a month with a small watermark — enough to see the quality for yourself before you ever enter a card.' },
  ];

  return (
    <div className="bg-[#08080A] text-white font-sans overflow-x-hidden">

      {/* ── SCROLL PROGRESS ─────────────────────────────── */}
      <motion.div
        style={{ scaleX: progressScaleX, transformOrigin: 'left' }}
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6A39C4] to-[#9758FF] z-[100]"
      />

      {/* ── NAV ──────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#08080A]/90 backdrop-blur-md border-b border-white/[0.04]' : ''}`}>
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
          <img src="/logo.png" alt="Vidora" className="h-14 w-auto object-contain" />
          <div className="hidden md:flex items-center gap-8">
            {[['How it works', 'how'], ['Features', 'features'], ['Gallery', 'gallery'], ['Pricing', 'pricing'], ['FAQ', 'faq']].map(([label, id]) => (
              <button key={id} onClick={() => scrollToId(id)} className="text-[14px] text-[#A1A1A5] hover:text-white transition-colors">{label}</button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setScreen('LOGIN')} className="text-[14px] text-[#A1A1A5] hover:text-white transition-colors">Sign In</button>
            <motion.button
              onClick={() => setScreen('CREATE_ACCOUNT')}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors shadow-[0_4px_20px_rgba(151,88,255,0.3)]"
            >
              Start for Free →
            </motion.button>
          </div>
          <button className="md:hidden text-[#A1A1A5] hover:text-white" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* ── MOBILE MENU ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-[#0A0A0C] border-l border-white/[0.06] z-[70] p-8 flex flex-col"
            >
              <div className="flex items-center justify-between mb-10">
                <img src="/logo.png" alt="Vidora" className="h-8 w-auto object-contain" />
                <button onClick={() => setMobileMenuOpen(false)} className="text-[#7A7A80] hover:text-white" aria-label="Close menu"><X size={20} /></button>
              </div>
              <div className="flex flex-col gap-6 flex-1">
                {[['How it works', 'how'], ['Features', 'features'], ['Gallery', 'gallery'], ['Pricing', 'pricing'], ['FAQ', 'faq']].map(([label, id]) => (
                  <button key={id} onClick={() => { setMobileMenuOpen(false); scrollToId(id); }} className="text-[16px] text-left text-[#A1A1A5] hover:text-white transition-colors">{label}</button>
                ))}
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => { setMobileMenuOpen(false); setScreen('LOGIN'); }} className="w-full border border-white/10 text-white py-3 rounded-xl text-[15px] font-medium hover:bg-white/5 transition-colors">Sign In</button>
                <button onClick={() => { setMobileMenuOpen(false); setScreen('CREATE_ACCOUNT'); }} className="w-full bg-[#9758FF] hover:bg-[#854EE6] text-white py-3 rounded-xl text-[15px] font-semibold transition-colors">Start for Free →</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── HERO ────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-24 px-6 overflow-hidden">
        <motion.div animate={{ x: [0, 24, 0], y: [0, -18, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-8%] left-[-4%] w-[600px] h-[600px] bg-[#673BA5] opacity-[0.10] rounded-full blur-[160px] pointer-events-none" />
        <motion.div animate={{ x: [0, -20, 0], y: [0, 22, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-8%] right-[-4%] w-[500px] h-[500px] bg-[#3B82F6] opacity-[0.06] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.022]"
          style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {HERO_PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[#9758FF] pointer-events-none"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, opacity: 0.3 }}
            animate={{ y: [0, -18, 0], opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: p.dur, repeat: Infinity, delay: p.del, ease: 'easeInOut' }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center text-center max-w-[880px]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-[#9758FF]/10 border border-[#9758FF]/20 rounded-full px-4 py-2 mb-8">
            <Sparkles size={13} className="text-[#9758FF]" />
            <span className="text-[12px] font-bold text-[#9758FF] uppercase tracking-[0.15em]">Made for solo creators</span>
          </motion.div>

          <div className="text-[46px] sm:text-[60px] lg:text-[72px] font-black tracking-tight leading-[1.05] mb-7 text-center">
            {[
              { text: 'Your one-person', gradient: false, delay: 0.1 },
              { text: 'content studio.', gradient: true,  delay: 0.2 },
            ].map((line) => (
              <div key={line.text} className="overflow-hidden">
                <motion.div initial={{ y: '110%' }} animate={{ y: 0 }} transition={{ duration: 0.75, delay: line.delay, ease: [0.22, 1, 0.36, 1] }}>
                  {line.gradient
                    ? <span className="bg-gradient-to-r from-[#9758FF] via-[#c084fc] to-[#9758FF] bg-clip-text text-transparent">{line.text}</span>
                    : <span>{line.text}</span>}
                </motion.div>
              </div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[18px] text-[#A1A1A5] max-w-[560px] leading-relaxed mb-10">
            Type a sentence, get a video you’d actually post. Vidora turns plain text into video, images, and voiceovers — no cameras, no editors, no budget.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 mb-6">
            <motion.button onClick={() => setScreen('CREATE_ACCOUNT')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-8 py-4 rounded-2xl font-bold text-[16px] transition-colors shadow-[0_12px_40px_rgba(151,88,255,0.4)] flex items-center justify-center gap-2">
              Start Creating Free <ArrowRight size={18} />
            </motion.button>
            <motion.button onClick={() => scrollToId('how')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] text-white px-8 py-4 rounded-2xl font-bold text-[16px] transition-colors flex items-center justify-center gap-2">
              <Play size={15} fill="white" /> See How It Works
            </motion.button>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className="text-[13px] text-[#5A5A60]">
            No credit card · 3 free generations every month · Cancel anytime
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
          style={{ y: mockupY }}
          transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full mt-20 px-4">
          <HeroShowcase />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS / DEMO ──────────────────────────── */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">How it works</span>
            </div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight mb-4">Write it. Watch it appear.</h2>
            <p className="text-[#A1A1A5] text-[16px] max-w-[480px] mx-auto">
              No timelines, no settings to learn. Describe what you want — here are real prompts and what comes back.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}><DemoStrip /></FadeUp>
        </div>
      </section>

      {/* ── FEATURES GRID ───────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">Everything in one place</span>
            </div>
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-tight mb-4">
              Five tools. One login. One bill.
            </h2>
            <p className="text-[#A1A1A5] text-[17px] max-w-[480px] mx-auto">
              Stop stitching together five subscriptions. Everything a solo creator needs to make and ship lives here.
            </p>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <FadeUp key={feature.title} delay={i * 0.07}
                className={i === 4 ? 'md:col-span-2 lg:col-span-1 lg:col-start-2' : ''}>
                <div className="relative bg-[#0D0D10] border border-white/[0.05] rounded-[24px] p-7 h-full flex flex-col hover:border-white/[0.1] hover:-translate-y-1 transition-all duration-300 group overflow-hidden">
                  <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 -skew-x-12" />
                  </div>
                  <div className="w-11 h-11 rounded-xl mb-5 flex items-center justify-center"
                    style={{ backgroundColor: `${feature.color}15`, border: `1px solid ${feature.color}25` }}>
                    <feature.icon size={20} style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-[18px] font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-[14px] text-[#7A7A80] leading-relaxed mb-5 flex-1">{feature.description}</p>
                  <div className="space-y-2.5">
                    {feature.bullets.map(bullet => (
                      <div key={bullet} className="flex items-start gap-2.5">
                        <CheckCircle2 size={14} className="shrink-0 mt-0.5" style={{ color: feature.color }} />
                        <span className="text-[13px] text-[#A1A1A5]">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT 1: Video ──────────────────────────── */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <SlideIn direction="left">
            <div className="inline-flex items-center gap-2 bg-[#9758FF]/10 border border-[#9758FF]/20 rounded-full px-3.5 py-1.5 mb-6">
              <PlaySquare size={13} className="text-[#9758FF]" />
              <span className="text-[11px] font-bold text-[#9758FF] uppercase tracking-[0.15em]">Video Generation</span>
            </div>
            <h2 className="text-[34px] sm:text-[42px] font-black tracking-tight mb-5 leading-tight">
              From one line of text<br />
              <span className="text-[#9758FF]">to a clip you’d post.</span>
            </h2>
            <p className="text-[16px] text-[#A1A1A5] leading-relaxed mb-8 max-w-[420px]">
              Describe the shot, pick a look, and Vidora handles the lighting, motion, and composition. Animate a still image too.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: Camera, label: 'Multiple film looks' },
                { icon: Zap, label: 'Up to 4K output' },
                { icon: ImagePlus, label: 'Image → video' },
                { icon: Layers, label: 'Portrait & landscape' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#9758FF]/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#9758FF]" />
                  </div>
                  <span className="text-[13px] text-[#C4C4C8] font-medium">{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen('CREATE_ACCOUNT')} className="flex items-center gap-2 text-[#9758FF] font-bold text-[15px] hover:gap-3 transition-all group">
              Try Video Generation <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SlideIn>

          <SlideIn direction="right" delay={0.1}>
            <div className="relative">
              <div className="absolute inset-0 bg-[#9758FF] opacity-[0.06] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative bg-[#0D0D10] border border-white/[0.06] rounded-[24px] p-4 overflow-hidden">
                <ShowcaseVideo src={SHOWCASE.videoClip.src} poster={SHOWCASE.videoClip.poster} label="Generated video" className="w-full aspect-video" />
              </div>
            </div>
          </SlideIn>
        </div>
      </section>

      {/* ── SPOTLIGHT 2: VoiceSync ───────────────────────── */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <SlideIn direction="left" delay={0.1} className="order-2 lg:order-1">
            <div className="relative">
              <div className="absolute inset-0 bg-[#10B981] opacity-[0.04] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative bg-[#0D0D10] border border-white/[0.06] rounded-[24px] p-6">
                <div className="flex items-end gap-1 justify-center mb-6 h-14">
                  {WAVEFORM_PARAMS.map((p, i) => (
                    <motion.div key={i} className="w-1.5 rounded-full bg-gradient-to-t from-[#6A39C4] to-[#10B981]"
                      animate={{ height: [8, p.peak, 8] }}
                      transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }} />
                  ))}
                </div>
                <div className="space-y-3">
                  {SHOWCASE.voices.map((voice, i) => (
                    <VoicePlayer key={voice.name} voice={voice} active={activeVoice === i} />
                  ))}
                </div>
                <div className="text-[10px] text-[#5A5A60] text-center mt-4">Studio-quality · download as audio</div>
              </div>
            </div>
          </SlideIn>

          <SlideIn direction="right" className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-3.5 py-1.5 mb-6">
              <Mic size={13} className="text-[#10B981]" />
              <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-[0.15em]">VoiceSync</span>
            </div>
            <h2 className="text-[34px] sm:text-[42px] font-black tracking-tight mb-5 leading-tight">
              Your voice, narrating<br />
              <span className="text-[#10B981]">everything.</span>
            </h2>
            <p className="text-[16px] text-[#A1A1A5] leading-relaxed mb-8 max-w-[420px]">
              Turn any script into a clean voiceover in seconds — or clone your own voice from a short sample and never record a take again.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { icon: Wand2, label: 'Text → speech' },
                { icon: Cpu, label: 'Clone your voice' },
                { icon: Mic, label: 'Built-in voices' },
                { icon: Layers, label: 'Download audio' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-[#10B981]" />
                  </div>
                  <span className="text-[13px] text-[#C4C4C8] font-medium">{label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setScreen('CREATE_ACCOUNT')} className="flex items-center gap-2 text-[#10B981] font-bold text-[15px] hover:gap-3 transition-all group">
              Explore VoiceSync <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </SlideIn>
        </div>
      </section>

      {/* ── GALLERY (real output, replaces fake testimonials) ── */}
      <section id="gallery" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">Made with Vidora</span>
            </div>
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-tight mb-4">See it before you sign up.</h2>
            <p className="text-[#A1A1A5] text-[17px] max-w-[460px] mx-auto">
              Real output, straight from the studio. Tap any to take a closer look.
            </p>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SHOWCASE.gallery.map((item, i) => (
              <FadeUp key={i} delay={(i % 4) * 0.06}>
                <button
                  onClick={() => setLightbox(i)}
                  className={`group relative w-full overflow-hidden rounded-2xl border border-white/[0.06] hover:border-white/[0.15] transition-all ${i % 5 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}
                >
                  {item.kind === 'video'
                    ? <ShowcaseVideo src={item.src} poster={item.poster} label={item.tag} rounded="rounded-2xl" className="w-full h-full" />
                    : <ShowcaseImage src={item.src} alt={item.tag} label={item.tag} rounded="rounded-2xl" className="w-full h-full" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-[11px] text-white/90 font-medium flex items-center gap-1.5">
                      {item.kind === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}{item.tag}
                    </span>
                  </div>
                </button>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIGHTBOX ─────────────────────────────────────── */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[90] flex items-center justify-center p-6"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white" onClick={() => setLightbox(null)} aria-label="Close"><X size={26} /></button>
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="relative max-w-[900px] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const item = SHOWCASE.gallery[lightbox];
                return item.kind === 'video'
                  ? <ShowcaseVideo src={item.src} poster={item.poster} label={item.tag} className="w-full max-h-[78vh]" />
                  : <ShowcaseImage src={item.src} alt={item.tag} label={item.tag} className="w-full max-h-[78vh]" />;
              })()}
              <div className="text-center mt-4 text-[13px] text-white/60">{SHOWCASE.gallery[lightbox].tag}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CAPABILITY STRIP (honest facts, not fake counts) ── */}
      <section className="py-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp>
            <div className="bg-[#0D0D10] border border-white/[0.05] rounded-[32px] p-10 sm:p-14 grid grid-cols-2 md:grid-cols-4 gap-10">
              <StatItem to={60}  suffix="s" label="To your first result" />
              <StatItem to={4}   suffix="K" label="Max resolution" />
              <StatItem to={3}   suffix=""  label="Tools in one studio" />
              <StatItem to={100} suffix="%" label="Commercial rights" />
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <FadeUp className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">Pricing</span>
            </div>
            <h2 className="text-[40px] sm:text-[48px] font-black tracking-tight mb-4">Pick a plan that grows with you.</h2>
            <p className="text-[#A1A1A5] text-[17px] max-w-[420px] mx-auto mb-8">
              Start free. Upgrade only when you’re posting more than you can keep up with.
            </p>
            <div className="inline-flex items-center gap-1 bg-[#131316] border border-white/[0.05] rounded-full p-1">
              <button onClick={() => setBillingAnnual(false)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all ${!billingAnnual ? 'bg-white text-black' : 'text-[#7A7A80] hover:text-white'}`}>
                Monthly
              </button>
              <button onClick={() => setBillingAnnual(true)}
                className={`px-5 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-2 ${billingAnnual ? 'bg-white text-black' : 'text-[#7A7A80] hover:text-white'}`}>
                Annual
                <span className="bg-[#10B981] text-white text-[10px] font-black px-2 py-0.5 rounded-full">-20%</span>
              </button>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-6">
            {plans.map((plan, i) => (
              <FadeUp key={plan.name} delay={i * 0.08}>
                <div className={`rounded-[32px] p-8 flex flex-col h-full relative transition-all ${plan.highlight ? 'bg-[#131316] border-2 border-[#9758FF] shadow-[0_0_60px_rgba(151,88,255,0.15)]' : 'bg-[#131316]/50 border border-white/5 hover:border-white/10'}`}>
                  {plan.highlight && (
                    <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 bg-[#9758FF] text-white px-8 py-2 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 whitespace-nowrap">
                      <Sparkles size={13} fill="currentColor" /> Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-2.5 rounded-xl ${plan.highlight ? 'bg-[#9758FF]/10 text-[#9758FF]' : 'bg-white/5 text-[#7A7A80]'}`}>
                      <plan.icon size={20} />
                    </div>
                    <h3 className="text-[18px] text-white font-bold">{plan.name}</h3>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-[40px] font-black text-white leading-none">${plan.price}</span>
                    <span className="text-[14px] text-[#5A5A60] font-bold tracking-wider mb-1 uppercase">/ mo</span>
                  </div>
                  {billingAnnual && (
                    <div className="text-[12px] text-[#10B981] font-medium mb-4">Billed annually · Save ~${Math.round(plan.price * 12 * 0.25)}/yr</div>
                  )}
                  <p className="text-[14px] text-[#A1A1A5] leading-relaxed mb-8 mt-2">{plan.description}</p>
                  <div className="flex flex-col gap-3.5 mb-8 flex-1">
                    {plan.features.map(f => (
                      <div key={f} className="flex items-start gap-3">
                        <CheckCircle2 size={15} className="text-[#9758FF] shrink-0 mt-0.5" />
                        <span className={`text-[13px] ${plan.highlight ? 'text-white font-medium' : 'text-[#EAEAEA]'}`}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button onClick={() => setScreen('CREATE_ACCOUNT')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    className={`w-full py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto ${plan.highlight ? 'bg-[#9758FF] hover:bg-[#854EE6] text-white shadow-[0_8px_24px_rgba(151,88,255,0.35)]' : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'}`}>
                    {plan.cta}
                  </motion.button>
                </div>
              </FadeUp>
            ))}
          </div>

          <FadeUp className="mt-10 text-center">
            <p className="text-[#7A7A80] text-[13px]">
              Just looking? The <span className="text-white font-bold">free plan</span> gives you 3 generations a month (with a small watermark) — no card needed.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-[760px] mx-auto">
          <FadeUp className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-full px-4 py-2 mb-5">
              <span className="text-[12px] font-bold text-[#7A7A80] uppercase tracking-[0.15em]">Questions</span>
            </div>
            <h2 className="text-[36px] sm:text-[44px] font-black tracking-tight mb-3">Good questions, straight answers.</h2>
          </FadeUp>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <FadeUp key={faq.q} delay={i * 0.05}>
                <FAQItem q={faq.q} a={faq.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[700px] h-[400px] bg-[#9758FF] opacity-[0.06] blur-[130px] rounded-full" />
        </div>
        <FadeUp>
          <div className="max-w-[680px] mx-auto text-center relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#9758FF]/10 border border-[#9758FF]/20 mb-8">
              <Sparkles size={28} className="text-[#9758FF]" />
            </div>
            <h2 className="text-[42px] sm:text-[52px] font-black tracking-tight mb-6 leading-tight">
              Make your first video<br />in the next minute.
            </h2>
            <p className="text-[17px] text-[#A1A1A5] mb-10 max-w-[440px] mx-auto">
              Free to try, no card required. See what you can make before you commit to anything.
            </p>
            <motion.button onClick={() => setScreen('CREATE_ACCOUNT')} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-10 py-5 rounded-2xl font-black text-[17px] transition-colors shadow-[0_16px_50px_rgba(151,88,255,0.4)] inline-flex items-center gap-3">
              Start Creating Free <ArrowRight size={20} />
            </motion.button>
            <p className="mt-5 text-[13px] text-[#5A5A60]">No credit card required. Up and running in 60 seconds.</p>
          </div>
        </FadeUp>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <img src="/logo.png" alt="Vidora" className="h-8 w-auto object-contain" />
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {[['How it works', 'how'], ['Features', 'features'], ['Gallery', 'gallery'], ['Pricing', 'pricing'], ['FAQ', 'faq']].map(([label, id]) => (
                <button key={id} onClick={() => scrollToId(id)} className="text-[13px] text-[#5A5A60] hover:text-white transition-colors">{label}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/[0.03]">
            <p className="text-[12px] text-[#3A3A40]">© {new Date().getFullYear()} Vidora. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-[12px] text-[#3A3A40] hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="text-[12px] text-[#3A3A40] hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
