export type CopyOutcome = 'copied' | 'failed'
/** The only browser capability in public docs; invoked only by a copy click. */
export async function copyCommand(
  command: string,
  write: (text: string) => Promise<void> = (text) =>
    navigator.clipboard.writeText(text),
): Promise<CopyOutcome> {
  try {
    await write(command)
    return 'copied'
  } catch {
    return 'failed'
  }
}
