// Map first Zod issue to a concise message based on path hints
// Keep this file dependency-free to allow reuse across isolated function packages
export const mapZodIssues = (issues: Array<{ path?: (string|number)[]; message?: string }>): { field?: string; msg: string } => {
  const first = issues && issues[0]
  const path = (first && (first.path || []).join('.')) || ''
  let msg = first?.message || '填写有误'
  // Common fields normalization
  if (/reason/.test(path)) msg = '请填写申请理由（不少于20字）'
  else if (/fields/.test(path)) msg = '请至少选择一个字段'
  else if (/patientId/.test(path)) msg = '缺少 patientId'
  else if (/expiresDays/.test(path)) msg = '有效期不合法'
  else if (/expiresAt/.test(path)) msg = '有效期时间不合法'
  else if (/status$/.test(path)) msg = '状态不合法'
  else if (/page(Size)?$/.test(path)) msg = '分页参数不合法'
  if (/id_card/.test(path)) msg = '身份证格式或校验位错误'
  else if (/phone/.test(path)) msg = '手机号格式错误'
  else if (/birthDate/.test(path)) msg = '出生日期格式错误'
  else if (/date$/.test(path)) msg = '日期格式不正确'
  else if (/capacity/.test(path)) msg = '容量需为 ≥0 的整数'
  else if (/title/.test(path)) msg = '标题需 2–40 字'
  else if (/location/.test(path)) msg = '地点需 ≤80 字'
  else if (/type/.test(path)) msg = '类型不合法'
  else if (/images/.test(path)) msg = '图片数量或格式不合法'
  return { field: path || undefined, msg }
}
