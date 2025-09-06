"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// index.ts
var registrations_exports = {};
__export(registrations_exports, {
  main: () => main
});
module.exports = __toCommonJS(registrations_exports);
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));
var import_zod = require("zod");

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});

// ../packages/core-rbac/index.ts
var isRole = async (db2, openId, role) => {
  var _a, _b, _c;
  if (!openId)
    return false;
  try {
    const _ = db2.command;
    const byOpenId = await db2.collection("Users").where({ openId, role }).limit(1).get();
    if ((_a = byOpenId == null ? void 0 : byOpenId.data) == null ? void 0 : _a.length)
      return true;
    const byId = await db2.collection("Users").where({ _id: openId, role }).limit(1).get();
    if ((_b = byId == null ? void 0 : byId.data) == null ? void 0 : _b.length)
      return true;
    const byRoles = await db2.collection("Users").where({ openId, roles: _.in([role]) }).limit(1).get();
    if ((_c = byRoles == null ? void 0 : byRoles.data) == null ? void 0 : _c.length)
      return true;
  } catch {
  }
  return false;
};

// index.ts
import_wx_server_sdk.default.init({ env: import_wx_server_sdk.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk.default.database();
var ListSchema = import_zod.z.object({
  activityId: import_zod.z.string().optional(),
  userId: import_zod.z.string().optional(),
  status: import_zod.z.enum(["registered", "waitlist", "cancelled"]).optional()
}).partial();
var RegisterSchema = import_zod.z.object({ activityId: import_zod.z.string() });
var CancelSchema = import_zod.z.object({ activityId: import_zod.z.string() });
var CheckinSchema = import_zod.z.object({ activityId: import_zod.z.string(), userId: import_zod.z.string().optional() });
var main = async (event) => {
  var _a, _b, _c, _d, _e, _f;
  try {
    const { action, payload } = event || {};
    const ctx = ((_b = (_a = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    const OPENID = ctx.OPENID;
    const now = Date.now();
    const canManage = async () => await isRole(db, OPENID, "admin") || await isRole(db, OPENID, "social_worker");
    switch (action) {
      case "list": {
        const q = ListSchema.parse(payload || {});
        const _ = db.command;
        const query = {};
        if (q.activityId)
          query.activityId = q.activityId;
        if (q.userId)
          query.userId = q.userId === "me" ? OPENID : q.userId;
        if (q.status)
          query.status = q.status;
        const res = await db.collection("Registrations").where(query).orderBy("createdAt", "desc").get();
        return ok(res.data);
      }
      case "register": {
        const { activityId } = RegisterSchema.parse(payload || {});
        if (!OPENID)
          return err("E_AUTH", "\u8BF7\u5148\u767B\u5F55");
        const trx = await db.startTransaction();
        try {
          const actRes = await trx.collection("Activities").doc(activityId).get();
          const activity = actRes == null ? void 0 : actRes.data;
          if (!activity) {
            await trx.rollback();
            return { ok: false, error: { code: "E_NOT_FOUND", msg: "\u6D3B\u52A8\u4E0D\u5B58\u5728" } };
          }
          const capacity = typeof activity.capacity === "number" ? activity.capacity : 0;
          const existRes = await trx.collection("Registrations").where({ activityId, userId: OPENID }).limit(1).get();
          const exist = existRes.data && existRes.data[0] || null;
          if (exist && (exist.status === "registered" || exist.status === "waitlist")) {
            await trx.commit();
            return err("E_CONFLICT", exist.status === "registered" ? "\u5DF2\u62A5\u540D" : "\u5DF2\u5728\u5019\u8865");
          }
          let registeredCount = 0;
          try {
            const c = await trx.collection("Registrations").where({ activityId, status: "registered" }).count();
            registeredCount = ((_c = c.total) != null ? _c : c.count) || 0;
          } catch {
          }
          const isUnlimited = capacity === 0;
          const canRegister = isUnlimited || registeredCount < capacity;
          if (exist) {
            await trx.collection("Registrations").doc(exist._id).update({ data: { status: canRegister ? "registered" : "waitlist", registeredAt: canRegister ? now : null, createdAt: exist.createdAt || now } });
            await trx.commit();
            return ok({ status: canRegister ? "registered" : "waitlist" });
          } else {
            const doc = { activityId, userId: OPENID, status: canRegister ? "registered" : "waitlist", createdAt: now };
            if (canRegister)
              doc.registeredAt = now;
            const addRes = await trx.collection("Registrations").add({ data: doc });
            await trx.commit();
            return ok({ _id: addRes._id, status: doc.status });
          }
        } catch (e) {
          try {
            await ((_d = db.runTransaction) == null ? void 0 : _d.call(db, () => Promise.resolve()));
          } catch {
          }
          return err(e.code || "E_INTERNAL", e.message);
        }
      }
      case "cancel": {
        const { activityId } = CancelSchema.parse(payload || {});
        if (!OPENID)
          return err("E_AUTH", "\u8BF7\u5148\u767B\u5F55");
        const trx = await db.startTransaction();
        try {
          const regRes = await trx.collection("Registrations").where({ activityId, userId: OPENID }).limit(1).get();
          const reg = regRes.data && regRes.data[0] || null;
          if (!reg) {
            await trx.rollback();
            return err("E_NOT_FOUND", "\u672A\u62A5\u540D");
          }
          if (reg.status === "cancelled") {
            await trx.commit();
            return ok({ updated: 0 });
          }
          await trx.collection("Registrations").doc(reg._id).update({ data: { status: "cancelled", cancelledAt: now } });
          const actRes = await trx.collection("Activities").doc(activityId).get();
          const activity = actRes == null ? void 0 : actRes.data;
          const capacity = typeof (activity == null ? void 0 : activity.capacity) === "number" ? activity.capacity : 0;
          const isUnlimited = capacity === 0;
          if (!isUnlimited) {
            let registeredCount = 0;
            try {
              const c = await trx.collection("Registrations").where({ activityId, status: "registered" }).count();
              registeredCount = ((_e = c.total) != null ? _e : c.count) || 0;
            } catch {
            }
            if (registeredCount < capacity) {
              const wl = await trx.collection("Registrations").where({ activityId, status: "waitlist" }).orderBy("createdAt", "asc").limit(1).get();
              const first = wl.data && wl.data[0] || null;
              if (first) {
                await trx.collection("Registrations").doc(first._id).update({ data: { status: "registered", registeredAt: now } });
              }
            }
          }
          await trx.commit();
          return ok({ updated: 1 });
        } catch (e) {
          try {
            await ((_f = db.runTransaction) == null ? void 0 : _f.call(db, () => Promise.resolve()));
          } catch {
          }
          return err(e.code || "E_INTERNAL", e.message);
        }
      }
      case "checkin": {
        const { activityId, userId } = CheckinSchema.parse(payload || {});
        const targetUserId = userId || OPENID;
        if (!targetUserId)
          return err("E_AUTH", "\u8BF7\u5148\u767B\u5F55");
        if (userId && !await canManage())
          return err("E_PERM", "\u4EC5\u7BA1\u7406\u5458/\u793E\u5DE5\u53EF\u4E3A\u4ED6\u4EBA\u7B7E\u5230");
        const regRes = await db.collection("Registrations").where({ activityId, userId: targetUserId }).limit(1).get();
        const reg = regRes.data && regRes.data[0] || null;
        if (!reg)
          return err("E_NOT_FOUND", "\u672A\u62A5\u540D");
        if (reg.checkedInAt)
          return ok({ updated: 0 });
        await db.collection("Registrations").doc(reg._id).update({ data: { checkedInAt: now } });
        return ok({ updated: 1 });
      }
      default:
        return err("E_ACTION", "unknown action");
    }
  } catch (e) {
    return err(e.code || "E_INTERNAL", e.message, e.stack);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
//# sourceMappingURL=index.js.map