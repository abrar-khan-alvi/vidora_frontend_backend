import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon, Mail, Calendar, ShieldCheck, Loader2, Check, AlertCircle,
  Save, KeyRound, Layers, ImagePlus, Video, Mic, Zap, Plus, Clock, Camera,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../auth/AuthContext';
import { authApi } from '../lib/api/auth';
import { ApiError } from '../lib/api/client';
import { generationApi, type GenerationJob } from '../lib/api/generation';
import { referenceApi, type TrainedReference } from '../lib/api/studio';
import { voiceApi } from '../lib/api/voice';
import { useToast } from '../components/Toast';

const fieldErr = (e: unknown, key: string, fallback: string) => {
  if (e instanceof ApiError && e.data && typeof e.data === 'object') {
    const v = (e.data as Record<string, unknown>)[key];
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    const d = (e.data as Record<string, unknown>).detail;
    if (typeof d === 'string') return d;
  }
  return fallback;
};

export const AccountSettingsContent = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Profile
  const [name, setName] = useState(user?.display_name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Relatable stats
  const [stats, setStats] = useState<{ creations: number; image: number; video: number; audio: number; credits: number; refs: number; voices: number } | null>(null);
  const [refs, setRefs] = useState<TrainedReference[]>([]);

  useEffect(() => { setName(user?.display_name ?? ''); }, [user?.display_name]);

  const loadRefs = () => referenceApi.list().then(setRefs).catch(() => {});

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const updatedUser = await authApi.updateAvatar(file);
      updateUser(updatedUser);
      toast.success('Profile picture updated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    Promise.all([
      generationApi.listAll().catch((): GenerationJob[] => []),
      referenceApi.list().catch((): TrainedReference[] => []),
      voiceApi.list().catch(() => []),
    ]).then(([jobs, refList, voices]) => {
      const done = jobs.filter((j) => j.status === 'succeeded');
      setRefs(refList);
      setStats({
        creations: done.length,
        image: done.filter((j) => j.kind === 'image').length,
        video: done.filter((j) => j.kind === 'video').length,
        audio: done.filter((j) => j.kind === 'audio').length,
        credits: jobs.reduce((s, j) => s + (j.credits_cost || 0), 0),
        refs: refList.length,
        voices: voices.length,
      });
    });
  }, []);

  // While a reference is still training, refresh so it flips to "ready" on its own.
  useEffect(() => {
    if (!refs.some((r) => r.status === 'pending')) return;
    const t = setInterval(loadRefs, 8000);
    return () => clearInterval(t);
  }, [refs]);

  const memberSince = useMemo(
    () => (user?.date_joined ? new Date(user.date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'),
    [user?.date_joined],
  );

  const nameDirty = name.trim() !== (user?.display_name ?? '').trim();

  const saveName = async () => {
    if (!name.trim() || !nameDirty || savingName) return;
    setSavingName(true); setNameMsg(null);
    try {
      const updated = await authApi.updateProfile(name.trim());
      updateUser(updated);
      setNameMsg({ ok: true, text: 'Saved.' });
    } catch (e) {
      setNameMsg({ ok: false, text: fieldErr(e, 'display_name', 'Could not save your name.') });
    } finally {
      setSavingName(false);
    }
  };

  const changePassword = async () => {
    if (savingPw) return;
    setPwMsg(null);
    if (next.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (next !== confirm) { setPwMsg({ ok: false, text: 'New passwords don’t match.' }); return; }
    setSavingPw(true);
    try {
      await authApi.changePassword(current, next);
      setPwMsg({ ok: true, text: 'Password updated.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      const msg = fieldErr(e, 'current_password', '') || fieldErr(e, 'new_password', 'Could not update password.');
      setPwMsg({ ok: false, text: msg });
    } finally {
      setSavingPw(false);
    }
  };

  const initials = (user?.display_name?.trim()?.[0] || user?.email?.[0] || 'U').toUpperCase();

  const input = 'w-full bg-[#08080A]/70 border border-[#24242B] rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-[#5A5A60] focus:outline-none focus:border-[#9758FF]/60 transition-colors';
  const label = 'text-[12px] font-medium text-[#7A7A80] mb-1.5 block';

  const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) =>
    m ? (
      <p className={`flex items-center gap-1.5 text-[12.5px] ${m.ok ? 'text-[#34D399]' : 'text-[#F87171]'}`}>
        {m.ok ? <Check size={13} /> : <AlertCircle size={13} />} {m.text}
      </p>
    ) : null;

  return (
    <div className="flex-1 w-full max-w-[840px] pb-12">
      <div className="mt-2 mb-7">
        <h1 className="text-[26px] font-bold tracking-tight text-white">Account settings</h1>
        <p className="text-[#7A7A80] text-[14px] mt-1">Manage your profile, security, and see your account at a glance.</p>
      </div>

      {/* Identity header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#16121F] to-[#0E0E10] p-6 mb-5 flex items-center gap-4">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-8 w-64 h-40 bg-[#9758FF]/20 blur-[110px] rounded-full" />
        <div className="relative group h-16 w-16 rounded-2xl overflow-hidden shadow-lg shrink-0 cursor-pointer">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#A06BFF] to-[#6D28D9] flex items-center justify-center text-white text-[26px] font-bold">
              {initials}
            </div>
          )}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] text-white font-medium transition-opacity cursor-pointer">
            {uploadingAvatar ? (
              <Loader2 size={16} className="animate-spin text-[#C9A8FF]" />
            ) : (
              <>
                <Camera size={14} className="mb-0.5 text-white" />
                <span>Change</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploadingAvatar} />
          </label>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-[18px] truncate">{user?.display_name || 'Your name'}</p>
          <p className="text-[#A1A1A5] text-[13.5px] truncate flex items-center gap-1.5"><Mail size={13} /> {user?.email}</p>
          <p className="text-[#7A7A80] text-[12.5px] mt-1 flex items-center gap-1.5">
            <ShieldCheck size={12} className={user?.is_active ? 'text-[#34D399]' : 'text-[#F59E0B]'} />
            {user?.is_active ? 'Verified account' : 'Unverified'} · <Calendar size={12} /> Member since {memberSince}
          </p>
        </div>
      </motion.div>

      {/* Account at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Creations', value: stats?.creations, icon: Layers, color: '#9758FF' },
          { label: 'Images', value: stats?.image, icon: ImagePlus, color: '#C084FC' },
          { label: 'Videos', value: stats?.video, icon: Video, color: '#60A5FA' },
          { label: 'Voiceovers', value: stats?.audio, icon: Mic, color: '#4ADE80' },
        ].map((s) => (
          <div key={s.label} className="bg-[#131316] border border-[#24242B] rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[#7A7A80] text-[12px]">{s.label}</span>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            <span className="text-[22px] font-bold text-white leading-none">{s.value ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Profile */}
      <section className="bg-[#131316] border border-[#24242B] rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-2 mb-5">
          <UserIcon size={17} className="text-[#9758FF]" />
          <h2 className="text-white font-semibold text-[15px]">Profile</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Username</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Your name" className={input} />
          </div>
          <div>
            <label className={label}>Email <span className="text-[#5A5A60]">(can’t be changed)</span></label>
            <input value={user?.email ?? ''} disabled className={`${input} opacity-60 cursor-not-allowed`} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Msg m={nameMsg} />
          <button onClick={saveName} disabled={!name.trim() || !nameDirty || savingName}
            className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#9758FF] to-[#C24DFF] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all">
            {savingName ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
          </button>
        </div>
      </section>

      {/* Your references */}
      <section className="bg-[#131316] border border-[#24242B] rounded-2xl p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ImagePlus size={17} className="text-[#C084FC]" />
            <h2 className="text-white font-semibold text-[15px]">Your references</h2>
            <span className="text-[#5A5A60] text-[12.5px]">{refs.length}</span>
          </div>
          <button onClick={() => navigate('/dashboard/image-generation')} className="flex items-center gap-1.5 text-[12.5px] text-[#9758FF] font-medium hover:gap-2.5 transition-all">
            <Plus size={14} /> New reference
          </button>
        </div>

        {refs.length === 0 ? (
          <p className="text-[#5A5A60] text-[13px]">No references yet — train one from your photos to put a person or subject into your images.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {refs.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 bg-[#08080A]/50 border border-[#24242B] rounded-xl p-2.5">
                {r.thumbnail_url
                  ? <img src={r.thumbnail_url} alt={r.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  : <span className="h-10 w-10 rounded-lg bg-[#9758FF]/15 flex items-center justify-center shrink-0"><ImagePlus size={16} className="text-[#9758FF]" /></span>}
                <div className="min-w-0">
                  <p className="text-white text-[13px] font-medium truncate">{r.name}</p>
                  {r.status === 'ready' && <span className="text-[11.5px] text-[#34D399]">Ready</span>}
                  {r.status === 'pending' && <span className="text-[11.5px] text-[#F59E0B] inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Training…</span>}
                  {r.status === 'failed' && <span className="text-[11.5px] text-[#F87171]">Failed</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {refs.some((r) => r.status === 'pending') && (
          <div className="flex items-start gap-2.5 mt-4 bg-[#F59E0B]/5 border border-[#F59E0B]/15 rounded-xl px-3.5 py-3">
            <Clock size={15} className="text-[#F59E0B] shrink-0 mt-0.5" />
            <p className="text-[12.5px] text-[#C9A07A] leading-relaxed">
              Training a reference runs on Higgsfield’s servers and is mostly <span className="text-white">queue time</span> — typically <span className="text-white">5–15 minutes</span> before it even starts, depending on their load. Vidora keeps polling and your reference flips to <span className="text-[#34D399]">Ready</span> automatically when it’s done — you can leave this page.
            </p>
          </div>
        )}
      </section>

      {/* Security */}
      <section className="bg-[#131316] border border-[#24242B] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <KeyRound size={17} className="text-[#9758FF]" />
          <h2 className="text-white font-semibold text-[15px]">Change password</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Current password</label>
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" placeholder="••••••••" className={input} />
          </div>
          <div>
            <label className={label}>New password</label>
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters" className={input} />
          </div>
          <div>
            <label className={label}>Confirm new</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Repeat new password" className={input} />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <Msg m={pwMsg} />
          <button onClick={changePassword} disabled={!current || !next || !confirm || savingPw}
            className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#9758FF] to-[#C24DFF] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-[13.5px] transition-all">
            {savingPw ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} Update password
          </button>
        </div>
        <p className="text-[11.5px] text-[#5A5A60] mt-3 flex items-center gap-1.5"><Zap size={11} className="text-[#9758FF]" /> {stats ? `${stats.credits} credits used · ${stats.refs} references · ${stats.voices} voices` : 'Loading account usage…'}</p>
      </section>
    </div>
  );
};
