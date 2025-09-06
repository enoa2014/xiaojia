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

