/** Full-viewport loading state shown while the session is being resolved. */
export const FullScreenLoader = () => (
  <div className="min-h-screen bg-[#08080A] flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-white/10 border-t-[#9758FF] animate-spin" />
  </div>
);
