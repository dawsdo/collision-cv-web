export const CLASS_COLORS: Record<string, string> = {
  person: '#5e6ad2',
  bicycle: '#f59e0b',
  car: '#22c55e',
  motorcycle: '#ec4899',
  bus: '#0ea5e9',
  truck: '#eab308',
}

export function getClassColor(className: string): string {
  return CLASS_COLORS[className] ?? '#6b7280'
}
