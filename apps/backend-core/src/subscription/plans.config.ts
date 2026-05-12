import { PlanInterval } from '@litecode/db';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const PLANS: Record<
  PlanInterval,
  {
    readonly razorpayPlanId: string;
    amount: number; // paise
    currency: string;
    totalCount: number;
    label: string;
  }
> = {
  MONTHLY: {
    get razorpayPlanId() {
      return requireEnv('RAZORPAY_PLAN_ID_MONTHLY');
    },
    amount: 30000, // ₹300
    currency: 'INR',
    totalCount: 60, // 5 years
    label: '₹30 / month',
  },
  YEARLY: {
    get razorpayPlanId() {
      return requireEnv('RAZORPAY_PLAN_ID_YEARLY');
    },
    amount: 300000, // ₹3000
    currency: 'INR',
    totalCount: 10, // 10 years
    label: '₹300 / year',
  },
};
