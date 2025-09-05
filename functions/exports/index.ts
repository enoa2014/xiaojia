
import cloud from 'wx-server-sdk'
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
export const main = async (event:any) => ({ ok: true, data: { ping: 'exports', event } })
