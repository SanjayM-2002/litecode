import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import { ARG_TYPES, RETURN_TYPES, TYPE_LABELS } from '@litecode/shared-types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { signaturePreview, type ProblemFormValues } from './problem-form'
import { FieldError } from './FieldError'

export function SignatureFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<ProblemFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'signature.args' })
  const signature = useWatch({ control, name: 'signature' })
  const sigErrors = errors.signature

  return (
    <div className="space-y-6">
      <div className="rounded-md border bg-muted/40 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Preview
        </p>
        <code className="text-sm">{signaturePreview(signature)}</code>
        <p className="mt-2 text-xs text-muted-foreground">
          Test case inputs must be a JSON array matching these arguments, in order.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="methodName">Method name</Label>
          <Input id="methodName" placeholder="twoSum" {...register('signature.methodName')} />
          <FieldError message={sigErrors?.methodName?.message} />
        </div>

        <div className="space-y-2">
          <Label>Return type</Label>
          <Controller
            control={control}
            name="signature.returnType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="font-mono text-xs">{t}</span>
                      <span className="ml-2 text-muted-foreground">{TYPE_LABELS[t]}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={sigErrors?.returnType?.message} />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Arguments</Label>
            <p className="text-xs text-muted-foreground">
              Only these types can be turned into starter code by the generators.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', type: 'int' })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add argument
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            No arguments yet. A method with no arguments is allowed but unusual.
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <Input
                placeholder={`arg${index + 1}`}
                {...register(`signature.args.${index}.name` as const)}
              />
              <FieldError message={sigErrors?.args?.[index]?.name?.message} />
            </div>
            <div className="w-[200px] space-y-1">
              <Controller
                control={control}
                name={`signature.args.${index}.type` as const}
                render={({ field: typeField }) => (
                  <Select value={typeField.value} onValueChange={typeField.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ARG_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          <span className="font-mono text-xs">{t}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={sigErrors?.args?.[index]?.type?.message} />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label="Remove argument"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}

        <FieldError message={sigErrors?.args?.message ?? sigErrors?.args?.root?.message} />
      </div>

      <p className="text-xs text-muted-foreground">
        Changing the signature after templates exist leaves the old generated code in place —
        regenerate each language on the Templates tab.
      </p>
    </div>
  )
}
