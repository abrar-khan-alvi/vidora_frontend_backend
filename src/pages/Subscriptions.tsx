import {
  CheckCircle2,
  Zap,
  Sparkles,
  Crown,
  Plus
} from 'lucide-react';

export const SubscriptionsContent = () => {
  return (
    <div className="flex-1 w-full flex flex-col pb-10">
      <div className="mb-10 mt-4 text-center sm:text-left">
        <h1 className="text-[32px] font-bold mb-3 text-white tracking-tight">Premium Access</h1>
        <p className="text-[#A1A1A5] text-[16px] max-w-[600px] leading-relaxed">
          Vidora is a premium AI studio. Choose the plan that protects your margins and scales your creative output.
        </p>
      </div>

      {/* Pricing Grid — pt-6 makes room for the "Most Popular" badge overflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-10 pt-6">

        {/* Starter Plan */}
        <div className="bg-[#131316]/50 rounded-[32px] p-8 border border-white/5 flex flex-col hover:border-white/10 transition-all shadow-xl group">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/5 p-2.5 rounded-xl text-[#7A7A80] group-hover:text-white transition-colors">
              <Zap size={20} />
            </div>
            <h3 className="text-[18px] text-white font-bold">Starter</h3>
          </div>

          <div className="flex items-end gap-1 mb-6">
            <span className="text-[40px] font-black text-white leading-none">$29</span>
            <span className="text-[14px] text-[#5A5A60] font-bold tracking-wider mb-1 uppercase">/ Month</span>
          </div>

          <p className="text-[14px] text-[#A1A1A5] leading-relaxed mb-10">
            For individuals who need high-quality AI visuals without the watermark.
          </p>

          <div className="flex flex-col gap-4 mb-10 flex-1">
            {[
              '10 High-Res Video Generations',
              'No Watermarks',
              'Commercial Usage Rights',
              'HD Quality Export',
              'Standard Rendering Speed'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#9758FF] shrink-0 mt-0.5" />
                <span className="text-[14px] text-[#EAEAEA]">{feature}</span>
              </div>
            ))}
          </div>

          <button className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto border border-white/5">
            Get Started
          </button>
        </div>

        {/* Creator Plan (Most Popular) */}
        <div className="bg-[#131316] rounded-[32px] p-8 border-2 border-[#9758FF] flex flex-col relative shadow-[0_0_60px_rgba(151,88,255,0.2)]">
          <div className="absolute -top-[18px] left-1/2 -translate-x-1/2 bg-[#9758FF] text-white px-8 py-2 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 whitespace-nowrap">
            <Sparkles size={14} fill="currentColor" /> Most Popular
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#9758FF]/10 p-2.5 rounded-xl text-[#9758FF]">
              <Crown size={20} />
            </div>
            <h3 className="text-[18px] text-white font-bold">Creator</h3>
          </div>

          <div className="flex items-end gap-1 mb-6">
            <span className="text-[40px] font-black text-white leading-none">$97</span>
            <span className="text-[14px] text-[#5A5A60] font-bold tracking-wider mb-1 uppercase">/ Month</span>
          </div>

          <p className="text-[14px] text-[#A1A1A5] leading-relaxed mb-10">
            Engineered for power creators making a mark in the digital landscape.
          </p>

          <div className="flex flex-col gap-4 mb-10 flex-1">
            {[
              '50 Premium Video Generations',
              '4K Ultra HD Exports',
              'Full Commercial Rights',
              'Advanced Motion Control',
              'Priority Rendering Path',
              'Beta Access to New Models'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#9758FF] shrink-0 mt-0.5" />
                <span className="text-[14px] text-white font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <button className="w-full bg-[#9758FF] hover:bg-[#854EE6] text-white py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto shadow-[0_10px_25px_rgba(151,88,255,0.4)] active:scale-[0.98]">
            Go Creator
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-[#131316]/50 rounded-[32px] p-8 border border-white/5 flex flex-col hover:border-white/10 transition-all shadow-xl group">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/5 p-2.5 rounded-xl text-[#7A7A80] group-hover:text-white transition-colors">
              <Zap size={20} />
            </div>
            <h3 className="text-[18px] text-white font-bold">Pro</h3>
          </div>

          <div className="flex items-end gap-1 mb-6">
            <span className="text-[40px] font-black text-white leading-none">$199</span>
            <span className="text-[14px] text-[#5A5A60] font-bold tracking-wider mb-1 uppercase">/ Month</span>
          </div>

          <p className="text-[14px] text-[#A1A1A5] leading-relaxed mb-10">
            Ultimate production tier for studios and enterprise scaling.
          </p>

          <div className="flex flex-col gap-4 mb-10 flex-1">
            {[
              'Unlimited Standard Generations',
              '200 4K Master Generations',
              'Custom Character References',
              'Dedicated Server Support',
              'Early API Access',
              'Team Collaboration Seats'
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-[#9758FF] shrink-0 mt-0.5" />
                <span className="text-[14px] text-[#EAEAEA]">{feature}</span>
              </div>
            ))}
          </div>

          <button className="w-full bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto border border-white/5">
            Get Pro
          </button>
        </div>
      </div>

      {/* Top-up Credits */}
      <div className="bg-[#131316] border border-white/5 rounded-[40px] p-8 sm:p-12 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-4 mb-5">
              <div className="bg-[#9758FF]/10 p-3 rounded-2xl text-[#9758FF] border border-[#9758FF]/20">
                <Plus size={26} strokeWidth={2.5} />
              </div>
              <h2 className="text-[28px] font-black text-white tracking-tight">Top-up Credits</h2>
            </div>
            <p className="text-[#A1A1A5] text-[16px] leading-relaxed max-w-[440px]">
              Running low mid-project? Purchase on-demand credit packs to keep your creative momentum without changing your subscription.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full lg:w-auto lg:min-w-[300px]">
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-[#9758FF]/40 transition-all group">
              <div className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-2 group-hover:text-[#9758FF] transition-colors">Standard</div>
              <div className="text-[22px] font-black text-white mb-4 tracking-tighter">100 Credits</div>
              <button className="w-full py-3 bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-xl text-[13px] font-bold transition-all active:scale-[0.95]">
                Buy for $15
              </button>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-[#9758FF]/40 transition-all group">
              <div className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-2 group-hover:text-[#9758FF] transition-colors">Creator</div>
              <div className="text-[22px] font-black text-white mb-4 tracking-tighter">500 Credits</div>
              <button className="w-full py-3 bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-xl text-[13px] font-bold transition-all active:scale-[0.95]">
                Buy for $50
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-center">
        <p className="text-[#5A5A60] text-[13px]">
          Running on a Free plan? Enjoy <span className="text-white font-bold">3 videos/month</span> with watermarks.
          <br/>The watermark is your ad — let them ask <span className="text-[#9758FF] italic">"what app is this??"</span>
        </p>
      </div>
    </div>
  );
};
