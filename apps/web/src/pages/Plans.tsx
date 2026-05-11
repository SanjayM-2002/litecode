import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { fetchMe, fetchPlans, startSubscription } from '@/lib/api/queries'
import { openRazorpayCheckout } from '@/lib/razorpay'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Plan, PlanInterval } from '@/lib/types'

const FEATURES = [
  'AI hint for any problem',
  'AI help on your in-progress code',
  'AI roast on your submissions',
  'Access to premium problems',
  'Unlimited submissions per problem',
]

function formatAmount(plan: Plan): string {
  if (plan.currency === 'INR') return `₹${(plan.amount / 100).toFixed(0)}`
  return `${plan.amount / 100} ${plan.currency}`
}

export function PlansPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PlanInterval | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
  })

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  const startMutation = useMutation({
    mutationFn: startSubscription,
  })

  const handleSubscribe = async (plan: Plan) => {
    setError(null)
    setPending(plan.interval)
    try {
      const result = await startMutation.mutateAsync(plan.interval)
      await openRazorpayCheckout({
        key: result.razorpayKeyId,
        subscription_id: result.razorpaySubscriptionId,
        name: 'litecode',
        description: `${plan.label} subscription`,
        prefill: {
          email: me?.email,
          name: me?.name ?? undefined,
        },
        theme: { color: '#ffa116' },
        handler: () => {
          // Payment captured. Razorpay webhooks will flip our tier; poll
          // mySubscription from the profile page to see status flip to ACTIVE.
          queryClient.invalidateQueries({ queryKey: ['mySubscription'] })
          queryClient.invalidateQueries({ queryKey: ['me'] })
          navigate('/profile?subscribed=1')
        },
        modal: {
          ondismiss: () => setPending(null),
        },
      })
    } catch (err) {
      const message = (err as Error).message ?? 'Failed to start subscription'
      setError(message.includes('ALREADY_SUBSCRIBED')
        ? 'You already have an active subscription.'
        : message)
      setPending(null)
    }
  }

  const isPremium = me?.tier === 'PREMIUM'

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Go Premium</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Unlock AI features, premium problems, and unlimited submissions.
        </p>
      </div>

      {isPremium && (
        <Card className="mb-6 border-[#ffb800]/40 bg-[#ffb800]/5">
          <CardContent className="p-4 text-sm">
            You're already on the Premium plan. Manage your subscription on the{' '}
            <a className="font-medium underline" href="/profile">
              profile page
            </a>
            .
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-destructive/40 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {plans?.map((plan) => {
            const isYearly = plan.interval === 'YEARLY'
            return (
              <Card key={plan.interval} className={isYearly ? 'border-[#ffa116]' : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {isYearly ? 'Yearly' : 'Monthly'}
                    </CardTitle>
                    {isYearly && (
                      <span className="rounded-full bg-[#ffa116]/15 px-2 py-0.5 text-xs font-medium text-[#ffa116]">
                        Save ~17%
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    <span className="text-2xl font-semibold text-foreground">
                      {formatAmount(plan)}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}/ {isYearly ? 'year' : 'month'}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="mb-6 space-y-2 text-sm">
                    {FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#00b8a3]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    disabled={isPremium || pending !== null}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {pending === plan.interval ? 'Opening checkout…' : 'Subscribe'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
