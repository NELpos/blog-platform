import { twMerge } from 'tailwind-merge'

type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | ClassValue[]
  | Record<string, boolean | null | undefined>

function flattenClassValue(value: ClassValue): string[] {
  if (!value) return []
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  if (Array.isArray(value)) {
    return value.flatMap(flattenClassValue)
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className)
  }
  return []
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(inputs.flatMap(flattenClassValue).join(' '))
}
