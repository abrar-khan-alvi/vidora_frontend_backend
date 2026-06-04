import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ImagePlus, Video, Mic, Sparkles, ArrowRight, Zap, Layers, Play,
  Plus, Flame, Clock, Wand2, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { generationApi, type GenerationJob } from '../lib/api/generation';
import { referenceApi, type TrainedReference } from '../lib/api/studio';
import { voiceApi, type Voice } from '../lib/api/voice';

const KIND = {
  image: { label: 'Image', plural: 'Images', icon: ImagePlus, color: '#C084FC', tab: 'image-generation' },
  video: { label: 'Video', plural: 'Videos', icon: Video, color: '#60A5FA', tab: 'video-generation' },
  audio: { label: 'Voiceover', plural: 'Voiceovers', icon: Mic, color: '#4ADE80', tab: 'voicesync' },
} as const;

const ACTIONS = [
  { tab: 'image-generation', icon: ImagePlus, title: 'Create Image', desc: 'Turn a prompt into a visual', grad: 'from-[#9758FF] to-[#C24DFF]' },
  { tab: 'video-generation', icon: Video, title: 'Create Video', desc: 'Animate an image into motion', grad: 'from-[#6D28D9] to-[#2563EB]' },
  { tab: 'voicesync', icon: Mic, title: 'Voiceover', desc: 'Speak any script aloud', grad: 'from-[#0EA5E9] to-[#22C55E]' },
  { tab: 'prompton', icon: Sparkles, title: 'Ask Prompton', desc: 'Brainstorm with your AI', grad: 'from-[#DB2777] to-[#9758FF]' },
];

function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const OverviewContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const go = (tab: string) => navigate(`/dashboard/${tab}`);

  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [refs, setRefs] = useState<TrainedReference[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      generationApi.listAll().catch(() => []),
      referenceApi.list().catch(() => []),
      voiceApi.list().catch(() => []),
    ]).then(([j, r, v]) => { setJobs(j); setRefs(r); setVoices(v); }).finally(() => setLoading(false));
  }, []);

  const firstName = (user?.display_name?.trim()?.split(' ')[0]) || user?.email?.split('@')[0] || 'there';

  const stats = useMemo(() => {
    const done = jobs.filter((j) => j.status === 'succeeded');
    const by = (k: string) => done.filter((j) => j.kind === k).length;
    const counts = { image: by('image'), video: by('video'), audio: by('audio') };
    const total = done.length;
    const creditsUsed = jobs.reduce((s, j) => s + (j.credits_cost || 0), 0);
    const favKind = (Object.keys(counts) as Array<keyof typeof counts>)
      .sort((a, b) => counts[b] - counts[a])
      .find((k) => counts[k] > 0);
    const recent = done.filter((j) => j.outputs.length > 0).slice(0, 6);
    const lastActivity = jobs[0]?.created_at;
    const lastFailed = jobs.find((j) => j.status === 'failed');
    return { counts, total, creditsUsed, favKind, recent, lastActivity, lastFailed };
  }, [jobs]);

  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const readyRef = refs.find((r) => r.status === 'ready');

  // Adaptive, "Vidora knows you" suggestions.
  const suggestions = useMemo(() => {
    const out: { title: string; desc: string; tab: string; icon: typeof Wand2; tint: string }[] = [];
    if (refs.length === 0) {
      out.push({ title: 'Put yourself in the picture', desc: 'Train a reference from your photos, then generate as that subject.', tab: 'image-generation', icon: ImagePlus, tint: '#C084FC' });
    } else if (readyRef) {
      out.push({ title: `Generate with “${readyRef.name}”`, desc: 'Use your trained reference in a fresh image.', tab: 'image-generation', icon: Sparkles, tint: '#C084FC' });
    }
    if (stats.counts.image > 0 && stats.counts.video === 0) {
      out.push({ title: 'Bring an image to life', desc: 'Turn one of your images into a short video.', tab: 'video-generation', icon: Video, tint: '#60A5FA' });
    }
    if (voices.length === 0 && stats.counts.audio === 0) {
      out.push({ title: 'Give it a voice', desc: 'Add a voiceover with a built-in voice — or clone your own.', tab: 'voicesync', icon: Mic, tint: '#4ADE80' });
    }
    if (stats.lastFailed) {
      const k = KIND[stats.lastFailed.kind as keyof typeof KIND];
      if (k) out.push({ title: 'Pick up a stuck one', desc: 'Your last attempt didn’t finish — give it another go.', tab: k.tab, icon: Clock, tint: '#F59E0B' });
    }
    out.push({ title: 'Need ideas?', desc: 'Brainstorm prompts and scripts with Prompton.', tab: 'prompton', icon: Wand2, tint: '#EC4899' });
    return out.slice(0, 3);
  }, [refs, readyRef, voices, stats]);

  const subtitle = loading
    ? 'Loading your studio…'
    : stats.total === 0
      ? 'Welcome to Vidora — let’s make your very first creation. ✨'
      : `You’ve made ${stats.total} creation${stats.total === 1 ? '' : 's'}${stats.favKind ? ` — your go-to is ${KIND[stats.favKind].plural}` : ''}.`;

  const fade = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' as const },
  });

  return (
    <div className="flex-1 w-full max-w-[1100px] pb-12">
      {/* Greeting */}
      <motion.div {...fade(0)} className="relative mt-2 mb-7 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#16121F] via-[#121214] to-[#0E0E10] p-7">
        <div aria-hidden className="pointer-events-none absolute -top-20 -right-10 w-[360px] h-[220px] bg-[#9758FF]/20 blur-[120px] rounded-full" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              Good {partOfDay}, <span className="bg-gradient-to-r from-[#C9A8FF] to-[#9758FF] bg-clip-text text-transparent">{firstName}</span> 👋
            </h1>
            <p className="text-[#A1A1A5] text-[15px] mt-1.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2.5">
            {stats.favKind && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12.5px] text-[#C9A8FF]">
                <Flame size={13} /> Favorite: {KIND[stats.favKind].plural}
              </span>
            )}
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[12.5px] text-[#A1A1A5]">
              <Zap size={13} className="text-[#9758FF]" /> {stats.creditsUsed} credits used
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <motion.div {...fade(1)} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {ACTIONS.map((a) => (
          <button
            key={a.tab}
            onClick={() => go(a.tab)}
            className="group relative text-left rounded-2xl p-[1px] bg-gradient-to-br from-white/[0.08] to-transparent hover:from-[#9758FF]/40 transition-all"
          >
            <div className="rounded-2xl bg-[#131316] h-full p-5 flex flex-col min-h-[150px] justify-between group-hover:-translate-y-0.5 transition-transform">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${a.grad} flex items-center justify-center shadow-lg`}>
                <a.icon size={21} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-[14.5px]">{a.title}</h3>
                <p className="text-[#7A7A80] text-[12.5px] mt-0.5 leading-snug">{a.desc}</p>
              </div>
              <ArrowRight size={16} className="absolute top-5 right-5 text-[#5A5A60] group-hover:text-[#9758FF] group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        ))}
      </motion.div>

      {/* Stats */}
      <motion.div {...fade(2)} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Creations', value: stats.total, icon: Layers, color: '#9758FF' },
          { label: 'Images', value: stats.counts.image, icon: ImagePlus, color: KIND.image.color },
          { label: 'Videos', value: stats.counts.video, icon: Video, color: KIND.video.color },
          { label: 'Voiceovers', value: stats.counts.audio, icon: Mic, color: KIND.audio.color },
        ].map((m) => (
          <div key={m.label} className="bg-[#131316] rounded-2xl p-5 border border-[#24242B] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[#A1A1A5] text-[13.5px] font-medium">{m.label}</span>
              <m.icon size={17} style={{ color: m.color }} />
            </div>
            <div className="text-[34px] font-bold text-white leading-none">{loading ? '—' : m.value}</div>
          </div>
        ))}
      </motion.div>

      {/* For you */}
      <motion.div {...fade(3)} className="mb-7">
        <div className="flex items-center gap-2 mb-3.5">
          <Sparkles size={16} className="text-[#9758FF]" />
          <h2 className="text-[16px] font-semibold text-white">For you</h2>
          <span className="text-[#5A5A60] text-[13px]">— picked from what you’ve been making</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {suggestions.map((s) => (
            <button key={s.title} onClick={() => go(s.tab)} className="group bg-[#131316] hover:bg-[#16161A] rounded-xl p-5 border border-[#24242B] hover:border-[#9758FF]/40 text-left transition-all flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex shrink-0 items-center justify-center" style={{ backgroundColor: `${s.tint}1A`, color: s.tint }}>
                <s.icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[14px] font-semibold text-white mb-1">{s.title}</h4>
                <p className="text-[12.5px] text-[#A1A1A5] leading-snug">{s.desc}</p>
              </div>
              <ChevronRight size={16} className="text-[#5A5A60] group-hover:text-[#9758FF] group-hover:translate-x-0.5 transition-all mt-0.5" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent creations */}
      {stats.recent.length > 0 && (
        <motion.div {...fade(4)} className="mb-7">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-white">Recent creations</h2>
              <p className="text-[#7A7A80] text-[13px] mt-0.5">{stats.lastActivity ? `Last active ${relativeTime(stats.lastActivity)}` : 'Jump back into your work'}</p>
            </div>
            <button onClick={() => go('history')} className="text-[13.5px] text-[#C084FC] hover:text-[#d8b4fe] font-medium transition-colors flex items-center gap-1">
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {stats.recent.map((j) => {
              const meta = KIND[j.kind as keyof typeof KIND] ?? KIND.image;
              const out = j.outputs[0];
              return (
                <button key={j.id} onClick={() => go(meta.tab)} title={j.prompt} className="group relative aspect-square rounded-xl overflow-hidden border border-white/[0.06] hover:border-[#9758FF]/40 bg-[#08080A] transition-all">
                  {j.kind === 'image' && <img src={out.url} alt={j.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                  {j.kind === 'video' && (
                    <>
                      <video src={out.url} muted playsInline className="w-full h-full object-cover" />
                      <span className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"><Play size={14} className="text-white ml-0.5" fill="white" /></span>
                    </>
                  )}
                  {j.kind === 'audio' && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0E2A1A] to-[#0E0E10]">
                      <Mic size={22} className="text-[#4ADE80]" />
                      <span className="text-[10px] text-[#7A7A80] px-2 line-clamp-2 text-center">{j.prompt}</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-semibold uppercase tracking-wide" style={{ color: meta.color }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Your library */}
      <motion.div {...fade(5)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* References */}
        <div className="bg-[#131316] rounded-2xl border border-[#24242B] p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <ImagePlus size={16} className="text-[#C084FC]" />
              <h3 className="text-white font-semibold text-[14.5px]">Your references</h3>
              <span className="text-[#5A5A60] text-[12.5px]">{refs.length}</span>
            </div>
            <button onClick={() => go('image-generation')} className="flex items-center gap-1 text-[12.5px] text-[#9758FF] font-medium hover:gap-2 transition-all"><Plus size={13} /> New</button>
          </div>
          {refs.length === 0 ? (
            <p className="text-[#5A5A60] text-[13px]">Train a reference to put a person or subject into your images.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {refs.slice(0, 6).map((r) => (
                <span key={r.id} className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg bg-[#08080A]/50 border border-[#24242B] text-[12.5px] text-[#C4C4C8]">
                  {r.thumbnail_url
                    ? <img src={r.thumbnail_url} alt={r.name} className="h-5 w-5 rounded object-cover" />
                    : <span className="h-5 w-5 rounded bg-[#9758FF]/20 flex items-center justify-center"><ImagePlus size={10} className="text-[#9758FF]" /></span>}
                  {r.name}
                  {r.status === 'pending' && <span className="text-[#F59E0B] text-[10px]">training</span>}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Voices */}
        <div className="bg-[#131316] rounded-2xl border border-[#24242B] p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <Mic size={16} className="text-[#4ADE80]" />
              <h3 className="text-white font-semibold text-[14.5px]">Your voices</h3>
              <span className="text-[#5A5A60] text-[12.5px]">{voices.length}</span>
            </div>
            <button onClick={() => go('voicesync')} className="flex items-center gap-1 text-[12.5px] text-[#9758FF] font-medium hover:gap-2 transition-all"><Plus size={13} /> New</button>
          </div>
          {voices.length === 0 ? (
            <p className="text-[#5A5A60] text-[13px]">Clone your voice, or use a built-in one for instant voiceovers.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {voices.slice(0, 6).map((v) => (
                <span key={v.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#08080A]/50 border border-[#24242B] text-[12.5px] text-[#C4C4C8]">
                  <Mic size={12} className="text-[#4ADE80]" /> {v.name}
                  {v.status === 'pending' && <span className="text-[#F59E0B] text-[10px]">cloning</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
