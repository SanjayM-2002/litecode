import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const colors = [
  'bg-rose-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-pink-500',
]

function colorFor(name: string | null | undefined) {
  const key = (name ?? '?').trim() || '?'
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
}

const sizeMap = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({ name, size = 'md', className, ...rest }: AvatarProps) {
  const letter = (name ?? '?').trim().charAt(0).toUpperCase() || '?'
  return (
    <div
      className={cn(
        'inline-flex select-none items-center justify-center rounded-full font-semibold text-white',
        colorFor(name),
        sizeMap[size],
        className
      )}
      aria-hidden="true"
      {...rest}
    >
      {letter}
    </div>
  )
}
