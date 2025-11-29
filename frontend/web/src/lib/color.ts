export function cssRgb(varName: string) {
  return `rgb(var(${varName}))`
}
export function cssRgba(varName: string, alpha: number) {
  return `rgba(var(${varName}), ${alpha})`
}

export const Colors = {
  fg: () => cssRgb('--foreground'),
  fgA: (a = 0.7) => cssRgba('--foreground', a),
  primary: () => cssRgb('--primary'),
  primaryA: (a = 0.8) => cssRgba('--primary', a),
  grid: () => cssRgba('--foreground', 0.15),
}

