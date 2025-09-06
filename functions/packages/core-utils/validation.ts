import { ZodError } from 'zod'

// Map first Zod issue to a concise message based on path hints
export const mapZodIssues = (issues: ZodError['issues']): { field?: string; msg: string } => {
  const first = issues && issues[0]
  const path = (first && (first.path || []).join('.')) || ''
  let msg = first?.message || '填写有误'
  // Common fields normalization
  if (/id_card/.test(path)) msg = '身份证格式或校验位错误'
  else if (/phone/.test(path)) msg = '手机号格式错误'
  else if (/birthDate/.test(path)) msg = '出生日期格式错误'
  else if (/date$/.test(path)) msg = '日期格式不正确'
  else if (/capacity/.test(path)) msg = '容量需为 ≥0 的整数'
  else if (/title/.test(path)) msg = '标题需 2–40 字'
  else if (/location/.test(path)) msg = '地点需 ≤80 字'
  else if (/type/.test(path)) msg = '类型不合法'
  return { field: path || undefined, msg }
}

