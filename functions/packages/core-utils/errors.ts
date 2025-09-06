// Unified response helpers
// Usage in functions: import { ok, err, errValidate } from '../packages/core-utils/errors'

export type ErrorPayload = { code: string; msg: string; details?: any }
export type Resp<T> = { ok: true; data: T } | { ok: false; error: ErrorPayload }

export const ok = <T>(data: T): Resp<T> => ({ ok: true, data })

export const err = <T = never>(code: string, msg: string, details?: any): Resp<T> => ({
  ok: false,
  error: { code, msg, details }
})

export const errValidate = <T = never>(msg: string, details?: any): Resp<T> => err('E_VALIDATE', msg, details)

