import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FormProvider, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { createProblem, fetchProblemForAdmin, updateProblem } from '@/lib/api/admin'
import type { AdminProblem } from '@/lib/admin-types'
import { useHasPermission } from '@/lib/admin'
import { toast } from '@/lib/stores/toast-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DetailsFields } from './components/DetailsFields'
import { SignatureFields } from './components/SignatureFields'
import {
  EMPTY_PROBLEM_FORM,
  problemFormSchema,
  problemToFormValues,
  type ProblemFormValues,
} from './components/problem-form'
import { TemplatesTab } from './tabs/TemplatesTab'
import { TestCasesTab } from './tabs/TestCasesTab'
import { PublishTab } from './tabs/PublishTab'

export function ProblemEditorPage() {
  const { id } = useParams<{ id: string }>()
  return id ? <EditProblem id={id} /> : <CreateProblem />
}

// ---- create ----

/**
 * `createProblem` needs metadata and signature in one call, so creation is a
 * single form. Everything else (templates, test cases, publishing) operates on
 * a saved problem and lives in the edit view.
 */
function CreateProblem() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canCreate = useHasPermission('CREATE_PROBLEM')

  const form = useForm<ProblemFormValues>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: EMPTY_PROBLEM_FORM,
  })

  const create = useMutation({
    mutationFn: (values: ProblemFormValues) =>
      createProblem({
        title: values.title,
        slug: values.slug,
        description: values.description,
        difficulty: values.difficulty,
        rating: values.rating,
        signature: values.signature,
        topicIds: values.topicIds,
      }),
    onSuccess: (problem) => {
      toast.success('Draft created', 'Now add templates and test cases.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] })
      navigate(`/admin/problems/${problem.id}`, { replace: true })
    },
    onError: (err) => toast.error('Failed to create problem', (err as Error).message),
  })

  if (!canCreate) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <h1 className="mb-2 text-lg font-semibold">Not allowed</h1>
        <p className="text-sm text-muted-foreground">
          You need the “Create problems” permission to author new problems.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <BackLink />
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">New problem</h1>
        <p className="text-sm text-muted-foreground">
          Saved as a draft — nothing is visible to participants until you publish.
        </p>
      </div>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
          className="space-y-8"
        >
          <section className="space-y-4">
            <SectionHeading title="Details" />
            <DetailsFields />
          </section>

          <section className="space-y-4">
            <SectionHeading
              title="Signature"
              subtitle="Drives generated templates and how test case inputs are shaped."
            />
            <SignatureFields />
          </section>

          <div className="flex justify-end gap-2 border-t pt-5">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/problems')}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Create draft
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  )
}

// ---- edit ----

function EditProblem({ id }: { id: string }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'problem', id],
    queryFn: () => fetchProblemForAdmin(id),
  })

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-6 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center">
        <BackLink />
        <h1 className="mb-2 text-lg font-semibold">Could not load problem</h1>
        <p className="text-sm text-muted-foreground">
          {(error as Error)?.message ?? 'Problem not found.'}
        </p>
      </div>
    )
  }

  return <EditProblemForm problem={data} />
}

function EditProblemForm({ problem }: { problem: AdminProblem }) {
  const queryClient = useQueryClient()
  const canEdit = useHasPermission('EDIT_PROBLEM')
  const [tab, setTab] = useState('details')

  // Mounted once per problem — later refetches (after template or test case
  // writes) must not clobber in-progress edits, so defaultValues are seeded
  // rather than synced.
  const form = useForm<ProblemFormValues>({
    resolver: zodResolver(problemFormSchema),
    defaultValues: problemToFormValues(problem),
  })

  const save = useMutation({
    mutationFn: (values: ProblemFormValues) =>
      updateProblem(problem.id, {
        title: values.title,
        slug: values.slug,
        description: values.description,
        difficulty: values.difficulty,
        rating: values.rating,
        signature: values.signature,
        topicIds: values.topicIds,
      }),
    onSuccess: (updated) => {
      toast.success('Changes saved')
      form.reset(problemToFormValues(updated))
      queryClient.invalidateQueries({ queryKey: ['admin', 'problem', problem.id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'problems'] })
      queryClient.invalidateQueries({ queryKey: ['problems'] })
    },
    onError: (err) => toast.error('Failed to save', (err as Error).message),
  })

  const isMetaTab = tab === 'details' || tab === 'signature'
  const dirty = form.formState.isDirty

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <BackLink />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{problem.title}</h1>
            <Badge variant={problem.isPublished ? 'success' : 'warning'} className="text-[10px]">
              {problem.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{problem.slug}</p>
        </div>
      </div>

      {!canEdit && (
        <p className="mb-4 rounded-md border border-dashed px-4 py-2.5 text-xs text-muted-foreground">
          You need the “Edit problems” permission to change this problem.
        </p>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="signature">Signature</TabsTrigger>
          <TabsTrigger value="templates">
            Templates
            <span className="ml-1.5 text-xs text-muted-foreground">
              {problem.templates.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="testCases">
            Test cases
            <span className="ml-1.5 text-xs text-muted-foreground">
              {problem.testCases.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="publish">Publish</TabsTrigger>
        </TabsList>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit((values) => save.mutate(values))}>
            <TabsContent value="details">
              <DetailsFields />
            </TabsContent>
            <TabsContent value="signature">
              <SignatureFields />
            </TabsContent>

            {isMetaTab && (
              <div className="mt-8 flex items-center justify-end gap-3 border-t pt-5">
                {dirty && (
                  <span className="text-xs text-muted-foreground">Unsaved changes</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!dirty}
                  onClick={() => form.reset(problemToFormValues(problem))}
                >
                  Discard
                </Button>
                <Button type="submit" disabled={!canEdit || !dirty || save.isPending}>
                  {save.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save changes
                </Button>
              </div>
            )}
          </form>
        </FormProvider>

        <TabsContent value="templates">
          <TemplatesTab problem={problem} />
        </TabsContent>
        <TabsContent value="testCases">
          <TestCasesTab problem={problem} />
        </TabsContent>
        <TabsContent value="publish">
          <PublishTab problem={problem} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---- bits ----

function BackLink() {
  return (
    <Link
      to="/admin/problems"
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      All problems
    </Link>
  )
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b pb-2">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
