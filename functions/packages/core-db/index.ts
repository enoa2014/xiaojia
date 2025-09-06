import cloud from 'wx-server-sdk'

// Assumes caller has already called cloud.init in their entry file.
// These helpers centralize access to DB and WX context.

export const getDB = () => {
  return cloud.database()
}

export const getCmd = () => {
  const db = getDB()
  return db.command
}

export const getContext = () => {
  return (cloud.getWXContext?.() || ({} as any))
}

export const getOpenId = (): string | null => {
  const ctx = getContext()
  return (ctx && (ctx as any).OPENID) || null
}

export type Sort = Record<string, 1 | -1>
export type PageQ = { page: number; pageSize: number; sort?: Sort }
export type PageMeta = { total: number; hasMore: boolean }

// Paginate helper with optional single-field sort fallback for TCB
export const paginate = async <T = any>(
  coll: any,
  pageQ: PageQ,
  opts?: { fallbackSort?: Sort; countQuery?: any; where?: any }
): Promise<{ items: T[]; meta: PageMeta }> => {
  const { page, pageSize, sort } = pageQ
  let query = coll
  const applySort = (q: any) => {
    const s = sort && Object.keys(sort).length ? sort : (opts?.fallbackSort || {})
    const entries = Object.entries(s)
    if (!entries.length) return q
    const [k, v] = entries[0]
    return (q as any).orderBy(k, v === -1 ? 'desc' : 'asc')
  }
  try { query = applySort(query) } catch { /* ignore sort error */ }

  // total count (best-effort)
  let total = 0
  try {
    const c = await (opts?.countQuery || coll).count() as any
    total = (c.total ?? c.count) || 0
  } catch { /* ignore */ }

  const res = await (query as any)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
  const items = (res && (res as any).data) || []
  const hasMore = page * pageSize < total
  return { items, meta: { total, hasMore } }
}
