import { type FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { fetchMe, updateProfile, type UpdateProfileInput } from '@/lib/api/queries'
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
import type { Gender } from '@/lib/types'

const GENDER_LABEL: Record<Gender, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
}

const GENDER_NONE = '__none__'

export function ProfilePage() {
  const queryClient = useQueryClient()
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  })

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
                {p.isPremium && <span className="font-medium text-[#ffb800]">Premium</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
