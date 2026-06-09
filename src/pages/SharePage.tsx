import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, AlertCircle, Loader2 } from 'lucide-react';
import { Logo } from '../components/ui';
import { publicationApi, type Publication } from '../lib/api/studio';

/** Public, no-auth page that plays a published video by its share token. */
export const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [pub, setPub] = useState<Publication | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError(true); setLoading(false); return; }
    publicationApi.getShare(token)
      .then(setPub)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-[#08080A] text-white flex flex-col">
      {/* Decorative glows */}
      <div className="fixed top-[-10%] left-[10%] w-[40vw] h-[40vw] min-w-[360px] bg-[#673BA5] opacity-15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-5%] w-[40vw] h-[40vw] min-w-[360px] bg-[#3B82F6] opacity-10 rounded-full blur-[140px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-6">
        <Link to="/"><Logo className="mb-0" /></Link>
        <Link
          to="/signup"
          className="bg-[#9758FF] hover:bg-[#854EE6] text-white px-4 py-2 rounded-xl font-semibold text-[13px] transition-colors"
        >
          Create your own
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-16">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-[#7A7A80]">
            <Loader2 size={26} className="animate-spin text-[#9758FF]" />
            <span className="text-[13px]">Loading…</span>
          </div>
        ) : error || !pub ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertCircle size={30} className="text-[#F87171]" />
            <p className="text-[16px] font-semibold">This video isn’t available</p>
            <p className="text-[13px] text-[#7A7A80] max-w-[360px]">The link may be wrong or the video was unpublished.</p>
          </div>
        ) : (
          <div className="w-full max-w-[860px] flex flex-col gap-5">
            <div className="rounded-3xl overflow-hidden border border-white/[0.07] bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] flex items-center justify-center">
              <video src={pub.video_url} controls autoPlay playsInline className="w-full max-h-[72vh] block" />
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-[20px] font-bold tracking-tight">{pub.title || 'Untitled'}</h1>
                <p className="text-[12.5px] text-[#7A7A80] mt-0.5">Made with Vidora · {new Date(pub.created_at).toLocaleDateString()}</p>
              </div>
              <a
                href={pub.video_url}
                download
                className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] text-[#C9A8FF] px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-colors"
              >
                <Download size={15} /> Download
              </a>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 text-center pb-8 text-[12px] text-[#5A5A60]">
        <Link to="/" className="hover:text-[#A1A1A5] transition-colors">Vidora — turn ideas into videos</Link>
      </footer>
    </div>
  );
};
