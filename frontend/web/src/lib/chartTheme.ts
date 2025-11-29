export function getCssVar(name: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name)
  return v?.trim() || '0 0 0'
}
export function rgb(name: string) {
  return `rgb(${getCssVar(name)})`
}
export function rgba(name: string, a: number) {
  return `rgba(${getCssVar(name)}, ${a})`
}

export function buildEchartsTheme() {
  const text = rgb('--foreground')
  const axis = rgba('--foreground', 0.55)
  const grid = rgba('--foreground', 0.15)
  const primary = rgb('--primary')
  const accent1 = rgba('--primary', 0.8)
  const accent2 = rgba('--foreground', 0.6)
  const accent3 = rgba('--foreground', 0.4)
  return {
    text,
    axis,
    grid,
    series: [primary, accent1, accent2, accent3],
  }
}

