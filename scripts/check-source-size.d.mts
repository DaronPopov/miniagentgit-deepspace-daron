export function permittedLines(path: string): number | undefined
export function physicalLines(source: string): number
export function checkFiles(
  paths: readonly string[],
  read?: (path: string) => string,
): { path: string; actual: number; maximum: number }[]
