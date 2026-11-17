import { validateHeadInput, validateHeadResult } from './contracts'

const repository = {
  type: 'string',
  pattern: '^repo_[a-z0-9]{16,32}$',
  maxLength: 37,
} as const
const inputJson = {
  type: 'object',
  properties: { repositoryId: repository },
  required: ['repositoryId'],
  additionalProperties: false,
} as const
const outputJson = {
  type: 'object',
  properties: {
    repositoryId: repository,
    commitId: {
      anyOf: [
        { type: 'string', pattern: '^[a-f0-9]{64}$', maxLength: 64 },
        { type: 'null' },
      ],
    },
    version: { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
  },
  required: ['repositoryId', 'commitId', 'version'],
  additionalProperties: false,
} as const
/** Public Standard Schema/JSON Schema v1, consumed by the SDK's AI asSchema.
 * No direct dependency on a hoisted AI/Zod package or private schema symbols.
 * Throw fixed errors at this framework boundary: AI's TypeValidationError can
 * otherwise include the raw rejected value in the SDK's validation detail.
 */
export const headInputSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'miniagentgit',
    jsonSchema: { input: () => inputJson, output: () => inputJson },
    validate: (value: unknown) => {
      const result = validateHeadInput(value)
      if (!result.ok) throw new Error('Expected only a valid repositoryId')
      return { value: result.value }
    },
  },
} as const
export const headOutputSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'miniagentgit',
    jsonSchema: { input: () => outputJson, output: () => outputJson },
    validate: (value: unknown) => {
      const result = validateHeadResult(value)
      if (!result.ok) throw new Error('Invalid repository HEAD result')
      return { value: result.value }
    },
  },
} as const
