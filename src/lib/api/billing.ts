import { apiFetch } from './client';

export interface Plan {
  slug: string;
  name: string;
  price: number;
  monthly_credits: number;
}

export interface SubscriptionStatus {
  has_plan: boolean;
  plan: Plan | null;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export const billingApi = {
  getStatus: () => apiFetch<SubscriptionStatus>('/billing/me/', { auth: true }),
  
  checkoutPlan: (plan_slug: string, successUrl?: string, cancelUrl?: string) => 
    apiFetch<{ checkout_url: string }>('/billing/checkout/', {
      method: 'POST',
      auth: true,
      body: { 
        plan_slug, 
        success_url: successUrl, 
        cancel_url: cancelUrl 
      }
    }),
    
  checkoutTopup: (topup_slug: string, successUrl?: string, cancelUrl?: string) => 
    apiFetch<{ checkout_url: string }>('/billing/checkout/', {
      method: 'POST',
      auth: true,
      body: { 
        topup_slug,
        success_url: successUrl, 
        cancel_url: cancelUrl 
      }
    }),
    
  createPortal: (returnUrl?: string) =>
    apiFetch<{ portal_url: string }>('/billing/portal/', {
      method: 'POST',
      auth: true,
      body: { return_url: returnUrl }
    })
};
