import { useState } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, Pencil } from 'lucide-react'
import { ALL_DIFFICULTIES, DIFFICULTY_LABELS } from '@litecode/shared-types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TopicMultiSelect } from './TopicMultiSelect'
import { slugify, type ProblemFormValues } from './problem-form'
import { FieldError } from './FieldError'

export function DetailsFields() {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<ProblemFormValues>()
  const [slugLocked, setSlugLocked] = useState(false)
  const [preview, setPreview] = useState(false)
  const slug = useWatch({ control, name: 'slug' })
  const description = useWatch({ control, name: 'description' })

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Two Sum"
            {...register('title', {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                // Keep the slug in step with the title until the admin edits it.
                if (!slugLocked) {
                  setValue('slug', slugify(e.target.value), { shouldValidate: true })
                }
              },
            })}
          />
          <FieldError message={errors.title?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            placeholder="two-sum"
            {...register('slug', { onChange: () => setSlugLocked(true) })}
          />
          <p className="text-xs text-muted-foreground">
            Participant URL: /problems/{slug || 'slug'}
          </p>
          <FieldError message={errors.slug?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.difficulty?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rating">Rating</Label>
          <Input
            id="rating"
            type="number"
            min={800}
            max={3500}
            step={50}
            {...register('rating', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">800–3500. Defaults to 1500.</p>
          <FieldError message={errors.rating?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Topics</Label>
        <Controller
          control={control}
          name="topicIds"
          render={({ field }) => (
            <TopicMultiSelect
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.topicIds}
            />
          )}
        />
        <FieldError message={errors.topicIds?.message} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Description (markdown)</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {preview ? 'Edit' : 'Preview'}
          </Button>
        </div>
        {preview ? (
          <div className="prose-leet min-h-60 rounded-md border p-4 text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {description || '_Nothing to preview yet._'}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            id="description"
            rows={14}
            placeholder={'Given an array of integers `nums`…\n\n**Example 1:**\n\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```'}
            className="font-mono text-[13px]"
            {...register('description')}
          />
        )}
        <FieldError message={errors.description?.message} />
      </div>
    </div>
  )
}
