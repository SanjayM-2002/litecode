import { type FormEvent, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  cancelSubscription,
  fetchMe,
  fetchMySubscription,
  updateProfile,
  type UpdateProfileInput,
} from '@/lib/api/queries'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Gender, Subscription, SubscriptionStatus } from '@/lib/types'

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  CREATED: 'Awaiting payment',
  AUTHENTICATED: 'Setting up',
  ACTIVE: 'Active',
  PENDING: 'Payment pending',
  HALTED: 'Payment failed (will retry)',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function SubscriptionSection({
  subscription,
  tier,
}: {
  subscription: Subscription | null
  tier: 'FREE' | 'PREMIUM'
}) {
  const queryClient = useQueryClient()
  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  // Treat anything still in the entitling/active set as "needs a cancel button".
  const canCancel =
    !!subscription &&
    ['CREATED', 'AUTHENTICATED', 'ACTIVE', 'PENDING', 'HALTED'].includes(
      subscription.status,
    )

  if (tier === 'FREE' && !subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>You're on the free plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/plans">View premium plans</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          {tier === 'PREMIUM' ? 'You\'re on the Premium plan.' : 'Subscription details.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {subscription && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">
                {subscription.planInterval === 'MONTHLY' ? 'Monthly' : 'Yearly'}
              </span>
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{STATUS_LABEL[subscription.status]}</span>
              <span className="text-muted-foreground">Current period ends</span>
              <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
              {subscription.cancelledAt && (
                <>
                  <span className="text-muted-foreground">Cancelled on</span>
                  <span className="font-medium">{formatDate(subscription.cancelledAt)}</span>
                </>
              )}
            </div>
            {cancelMutation.isError && (
              <p className="text-sm text-destructive">
                {(cancelMutation.error as Error).message || 'Failed to cancel'}
              </p>
            )}
            {canCancel && subscription.status !== 'CANCELLED' && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Cancel subscription? You keep Premium until the period ends.')) {
                      cancelMutation.mutate()
                    }
                  }}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? 'Cancelling…' : 'Cancel subscription'}
                </Button>
              </div>
            )}
          </>
        )}
        {!subscription && tier === 'PREMIUM' && (
          <p className="text-muted-foreground">
            Your account is Premium but we don't have a subscription record on file. Contact support
            if this looks wrong.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

const GENDER_LABEL: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
}

const GENDER_NONE = '__none__'

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const justSubscribed = searchParams.get('subscribed') === '1'

  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  })

  // Poll subscription state for ~30s after a successful Razorpay Checkout,
  // since webhook → DB → tier flip is not instantaneous. Stops polling once
  // the user is PREMIUM or once we've polled enough times.
  const subscriptionQuery = useQuery({
    queryKey: ['mySubscription'],
    queryFn: fetchMySubscription,
    refetchInterval: (q) => {
      if (!justSubscribed) return false
      const sub = q.state.data
      if (sub?.status === 'ACTIVE') return false
      return 2000
    },
  })

  // Once the subscription lands as ACTIVE, drop the query-param so polling stops
  // permanently and the URL is clean for refreshes.
  useEffect(() => {
    if (justSubscribed && subscriptionQuery.data?.status === 'ACTIVE') {
      setSearchParams({}, { replace: true })
      queryClient.invalidateQueries({ queryKey: ['me'] })
    }
  }, [justSubscribed, subscriptionQuery.data?.status, setSearchParams, queryClient])

  const [bio, setBio] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [gender, setGender] = useState<Gender | typeof GENDER_NONE>(GENDER_NONE)
  const [skills, setSkills] = useState('')
  const [birthday, setBirthday] = useState('')

  useEffect(() => {
    const p = me?.participantProfile
    if (!p) return
    setBio(p.bio ?? '')
    setCity(p.city ?? '')
    setState(p.state ?? '')
    setCountry(p.country ?? '')
    setGender((p.gender ?? GENDER_NONE) as Gender | typeof GENDER_NONE)
    setSkills((p.skills ?? []).join(', '))
    setBirthday(p.birthday ? p.birthday.slice(0, 10) : '')
  }, [me])

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const input: UpdateProfileInput = {
      bio: bio || null,
      city: city || null,
      state: state || null,
      country: country || null,
      gender: gender === GENDER_NONE ? null : (gender as Gender),
      skills: skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      birthday: birthday ? new Date(birthday).toISOString() : null,
    }
    mutation.mutate(input)
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!me) return null
  const p = me.participantProfile

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <Card className="mb-6">
        <CardContent className="flex items-center gap-5 p-6">
          <Avatar name={me.name ?? me.email} size="lg" />
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{me.name ?? 'No name set'}</h1>
            <p className="text-sm text-muted-foreground">{me.email}</p>
            {p && (
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>Rating: <span className="font-medium text-foreground">{p.rating}</span></span>
                <span>Coins: <span className="font-medium text-foreground">{p.coins}</span></span>
                {me.tier === 'PREMIUM' && (
                  <span className="font-medium text-[#ffb800]">Premium</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {justSubscribed && subscriptionQuery.data?.status !== 'ACTIVE' && (
        <Card className="mb-6 border-[#ffa116]/40 bg-[#ffa116]/5">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#ffa116]" />
            Waiting for Razorpay to confirm your payment — this usually takes a few seconds.
          </CardContent>
        </Card>
      )}

      <div className="mb-6">
        <SubscriptionSection
          subscription={subscriptionQuery.data ?? null}
          tier={me.tier}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Update your profile details. Only you can see private fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender | typeof GENDER_NONE)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GENDER_NONE}>—</SelectItem>
                    {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
                      <SelectItem key={g} value={g}>
                        {GENDER_LABEL[g]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="e.g. graphs, dp, sql"
                />
              </div>
            </div>

            {mutation.isError && (
              <p className="text-sm text-destructive">
                {(mutation.error as Error).message || 'Failed to save profile'}
              </p>
            )}
            {mutation.isSuccess && (
              <p className="text-sm text-[#00b8a3]">Profile updated.</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
