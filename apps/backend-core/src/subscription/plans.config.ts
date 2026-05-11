import { PlanInterval } from '@litecode/db';

// Razorpay is the source of truth for price. To change the price, create a NEW
// plan in the Razorpay dashboard (you can't edit an existing plan's amount) and
// update `razorpayPlanId` here. `amount` is for display in the /plans response
// only and must match what was set on Razorpay's side.
//
// `total_count` is how many billing cycles Razorpay will charge before the
// subscription auto-completes — Razorpay has no "infinite" option, so pick a
// large enough number that real users won't hit it.
export const PLANS: Record<
  PlanInterval,
  {
    razorpayPlanId: string;
    amount: number; // paise
    currency: string;
    totalCount: number;
    label: string;
  }
> = {
  MONTHLY: {
    razorpayPlanId: 'plan_REPLACE_WITH_MONTHLY_ID',
    amount: 30000, // ₹300
    currency: 'INR',
    totalCount: 60, // 5 years
    label: '₹30 / month',
  },
  YEARLY: {
    razorpayPlanId: 'plan_REPLACE_WITH_YEARLY_ID',
    amount: 300000, // ₹3000
    currency: 'INR',
    totalCount: 10, // 10 years
    label: '₹300 / year',
  },
};
