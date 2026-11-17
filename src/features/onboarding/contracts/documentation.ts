export type ShellMode = 'powershell' | 'curl'
export type Placeholder =
  | 'BASE_URL'
  | 'TOKEN'
  | 'CREATE_KEY'
  | 'COMMIT_KEY'
  | 'REPOSITORY_ID'
  | 'COMMIT_ID'
  | 'JOB_ID'
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }
export interface HttpExample {
  readonly id: string
  readonly label: string
  readonly method: 'GET' | 'POST'
  readonly route: string
  readonly authenticated: boolean
  readonly payload?: JsonValue
  readonly explanation: string
  readonly placeholders: readonly Placeholder[]
  readonly capture?: 'REPOSITORY_ID' | 'COMMIT_ID' | 'JOB_ID'
}
export interface CommandExample extends HttpExample {
  readonly shell: ShellMode
  readonly command: string
}
export interface DocumentationSection {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
}
