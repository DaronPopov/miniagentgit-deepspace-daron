interface Schema {
  readonly type?: 'object' | 'string' | 'integer' | 'boolean' | 'array' | 'null'
  readonly properties?: Readonly<Record<string, Schema>>
  readonly required?: readonly string[]
  readonly additionalProperties?: false
  readonly anyOf?: readonly Schema[]
  readonly items?: Schema
  readonly enum?: readonly (string | number)[]
  readonly pattern?: string
  readonly minLength?: number
  readonly maxLength?: number
  readonly minItems?: number
  readonly maxItems?: number
  readonly minimum?: number
  readonly maximum?: number
  readonly description?: string
}

export const string = (maxLength: number, pattern?: string) =>
  ({ type: 'string', maxLength, ...(pattern && { pattern }) }) as const
export const integer = {
  type: 'integer',
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
} as const
export const enumeration = (...values: readonly (string | number)[]) => ({
  enum: values,
})
export const object = (
  properties: Readonly<Record<string, Schema>>,
  optional: readonly string[] = [],
) => ({
  type: 'object' as const,
  properties,
  required: Object.keys(properties).filter((key) => !optional.includes(key)),
  additionalProperties: false as const,
})

export function schemaAdapter(
  schema: Schema,
  validate?: (value: unknown) => boolean,
) {
  return {
    '~standard': {
      version: 1 as const,
      vendor: 'miniagentgit',
      jsonSchema: { input: () => schema, output: () => schema },
      validate: (value: unknown) => {
        if (validate && !validate(value)) throw new Error('Invalid tool result')
        // Inputs are validated in execute by the application validators to
        // preserve typed quota and input errors across REST and MCP.
        return { value }
      },
    },
  }
}

export function matches(schema: Schema, value: unknown): boolean {
  if (schema.anyOf) return schema.anyOf.some((entry) => matches(entry, value))
  if (schema.enum) return schema.enum.some((entry) => entry === value)
  switch (schema.type) {
    case 'object': {
      if (typeof value !== 'object' || !value || Array.isArray(value))
        return false
      const entries = Object.entries(value)
      const properties = schema.properties ?? {}
      return (
        (schema.required ?? []).every((key) => Object.hasOwn(value, key)) &&
        entries.every(([key, field]) => {
          const property = Object.hasOwn(properties, key)
            ? properties[key]
            : undefined
          return property !== undefined && matches(property, field)
        })
      )
    }
    case 'array':
      return (
        Array.isArray(value) &&
        value.length >= (schema.minItems ?? 0) &&
        value.length <= (schema.maxItems ?? Infinity) &&
        value.every((entry) => schema.items && matches(schema.items, entry))
      )
    case 'string':
      return (
        typeof value === 'string' &&
        value.length >= (schema.minLength ?? 0) &&
        value.length <= (schema.maxLength ?? Infinity) &&
        (!schema.pattern || new RegExp(schema.pattern).test(value))
      )
    case 'integer':
      return (
        typeof value === 'number' &&
        Number.isSafeInteger(value) &&
        value >= (schema.minimum ?? -Infinity) &&
        value <= (schema.maximum ?? Infinity)
      )
    case 'boolean':
      return typeof value === 'boolean'
    case 'null':
      return value === null
    default:
      return false
  }
}
