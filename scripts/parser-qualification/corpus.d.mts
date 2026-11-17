export const corpus: readonly {
  readonly name: string
  readonly extension: '.js' | '.jsx' | '.ts' | '.tsx' | '.json'
  readonly text: string
  readonly outcomes: readonly ('parsed' | 'recursion' | 'syntax')[]
}[]

export const aggregateDense: readonly {
  readonly path: string
  readonly text: string
}[]
