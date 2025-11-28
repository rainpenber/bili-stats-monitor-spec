export function toWan(n: number): string {
  if (n >= 10000) {
    const v = Math.round((n / 10000) * 10) / 10
    return `${v}万`
  }
  return String(n)
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

