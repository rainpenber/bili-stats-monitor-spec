import { Scheme } from '@/store/uiSelection'

export function isDarkScheme(scheme: Scheme): boolean {
  if (scheme === 'dark') return true
  if (scheme === 'light') return false
  // system
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

