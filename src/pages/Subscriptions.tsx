import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Zap,
  Sparkles,
  Crown,
  Plus,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { billingApi, type SubscriptionStatus } from '../lib/api/billing';
import { useToast } from '../components/Toast';

export const SubscriptionsContent = () => {
  const toast = useToast();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    billingApi.getStatus()
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (slug: string, isTopup: boolean = false) => {
    try {
      setCheckoutLoading(slug);
      const url = window.location.origin;
      const res = isTopup
        ? await billingApi.checkoutTopup(slug, `${url}/dashboard/subscriptions?success=true`, `${url}/dashboard/subscriptions?canceled=true`)
        : await billingApi.checkoutPlan(slug, `${url}/dashboard/subscriptions?success=true`, `${url}/dashboard/subscriptions?canceled=true`);

      if (res.checkout_url) {
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
      toast.error('Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    try {
      setCheckoutLoading('portal');
      const url = window.location.origin;
      const res = await billingApi.createPortal(`${url}/dashboard/subscriptions`);
      if (res.portal_url) {
        window.location.href = res.portal_url;
      }
    } catch (err) {
      console.error('Portal failed:', err);
      toast.error('Could not open billing portal.');
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center pb-10">
        <Loader2 size={32} className="animate-spin text-[#9758FF]" />
      </div>
    );
  }

  const activePlanSlug = status?.has_plan ? status.plan?.slug : null;

  return (
    <div className="flex-1 w-full flex flex-col pb-10">
      <div className="mb-10 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[32px] font-bold mb-3 text-white tracking-tight">Premium Access</h1>
          <p className="text-[#A1A1A5] text-[16px] max-w-[600px] leading-relaxed">
            Vidora is a premium AI studio. Choose the plan that protects your margins and scales your creative output.
          </p>
        </div>
        {status?.has_plan && (
          <button
            onClick={handlePortal}
            disabled={!!checkoutLoading}
            className="flex items-center gap-2 bg-[#131316] border border-white/[0.08] hover:bg-white/[0.04] text-white px-5 py-2.5 rounded-xl font-medium text-[14px] transition-all"
          >
            {checkoutLoading === 'portal' ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
            Manage Billing
          </button>
        )}
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-10 pt-6">

        {/* Starter Plan */}
        <div className={`bg-[#131316]/50 rounded-[32px] p-8 border ${activePlanSlug === 'starter' ? 'border-[#9758FF]' : 'border-white/5 hover:border-white/10'} flex flex-col transition-all shadow-xl group relative`}>
          {activePlanSlug === 'starter' && (
            <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-[#9758FF] text-white px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
              Current Plan
            </div>
          )}
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

          <button
            onClick={() => handleCheckout('starter')}
            disabled={!!checkoutLoading || activePlanSlug === 'starter'}
            className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 text-white py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto border border-white/5 flex items-center justify-center gap-2"
          >
            {checkoutLoading === 'starter' ? <Loader2 size={18} className="animate-spin" /> : null}
            {activePlanSlug === 'starter' ? 'Current Plan' : 'Get Started'}
          </button>
        </div>

        {/* Creator Plan (Most Popular) */}
        <div className={`bg-[#131316] rounded-[32px] p-8 border-2 ${activePlanSlug === 'creator' ? 'border-[#34D399]' : 'border-[#9758FF]'} flex flex-col relative shadow-[0_0_60px_rgba(151,88,255,0.2)]`}>
          <div className={`absolute -top-[18px] left-1/2 -translate-x-1/2 ${activePlanSlug === 'creator' ? 'bg-[#34D399]' : 'bg-[#9758FF]'} text-white px-8 py-2 rounded-full text-[12px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2 whitespace-nowrap`}>
            {activePlanSlug === 'creator' ? 'Current Plan' : <><Sparkles size={14} fill="currentColor" /> Most Popular</>}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className={`bg-[#9758FF]/10 p-2.5 rounded-xl ${activePlanSlug === 'creator' ? 'text-[#34D399]' : 'text-[#9758FF]'}`}>
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
                <CheckCircle2 size={16} className={`${activePlanSlug === 'creator' ? 'text-[#34D399]' : 'text-[#9758FF]'} shrink-0 mt-0.5`} />
                <span className="text-[14px] text-white font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => handleCheckout('creator')}
            disabled={!!checkoutLoading || activePlanSlug === 'creator'}
            className={`w-full ${activePlanSlug === 'creator' ? 'bg-[#131316] border border-[#34D399] text-[#34D399] opacity-70' : 'bg-[#9758FF] hover:bg-[#854EE6] text-white shadow-[0_10px_25px_rgba(151,88,255,0.4)]'} py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto active:scale-[0.98] flex items-center justify-center gap-2`}
          >
            {checkoutLoading === 'creator' ? <Loader2 size={18} className="animate-spin" /> : null}
            {activePlanSlug === 'creator' ? 'Current Plan' : 'Go Creator'}
          </button>
        </div>

        {/* Pro Plan */}
        <div className={`bg-[#131316]/50 rounded-[32px] p-8 border ${activePlanSlug === 'pro' ? 'border-[#9758FF]' : 'border-white/5 hover:border-white/10'} flex flex-col transition-all shadow-xl group relative`}>
          {activePlanSlug === 'pro' && (
            <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-[#9758FF] text-white px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap">
              Current Plan
            </div>
          )}
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

          <button
            onClick={() => handleCheckout('pro')}
            disabled={!!checkoutLoading || activePlanSlug === 'pro'}
            className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5 text-white py-4 rounded-2xl font-bold text-[15px] transition-all mt-auto border border-white/5 flex items-center justify-center gap-2"
          >
            {checkoutLoading === 'pro' ? <Loader2 size={18} className="animate-spin" /> : null}
            {activePlanSlug === 'pro' ? 'Current Plan' : 'Get Pro'}
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
              <button
                onClick={() => handleCheckout('standard_topup', true)}
                disabled={!!checkoutLoading}
                className="w-full py-3 bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] flex items-center justify-center gap-2"
              >
                {checkoutLoading === 'standard_topup' ? <Loader2 size={16} className="animate-spin" /> : null}
                Buy for $15
              </button>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-[#9758FF]/40 transition-all group">
              <div className="text-[#7A7A80] text-[10px] font-black uppercase tracking-[0.2em] mb-2 group-hover:text-[#9758FF] transition-colors">Creator</div>
              <div className="text-[22px] font-black text-white mb-4 tracking-tighter">500 Credits</div>
              <button
                onClick={() => handleCheckout('creator_topup', true)}
                disabled={!!checkoutLoading}
                className="w-full py-3 bg-[#9758FF] hover:bg-[#854EE6] text-white rounded-xl text-[13px] font-bold transition-all active:scale-[0.95] flex items-center justify-center gap-2"
              >
                {checkoutLoading === 'creator_topup' ? <Loader2 size={16} className="animate-spin" /> : null}
                Buy for $50
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
