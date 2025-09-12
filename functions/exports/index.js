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
var exports_exports = {};
__export(exports_exports, {
  main: () => main
});
module.exports = __toCommonJS(exports_exports);
var import_wx_server_sdk2 = __toESM(require("wx-server-sdk"));

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});
var errValidate = (msg, details) => err("E_VALIDATE", msg, details);

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
var hasAnyRole = async (db2, openId, roles) => {
  for (const r of roles) {
    if (await isRole(db2, openId, r))
      return true;
  }
  return false;
};

// index.ts
var import_zod = require("zod");

// ../packages/core-db/index.ts
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));
var paginate = async (coll, pageQ, opts) => {
  const { page, pageSize, sort } = pageQ;
  let query = coll;
  const applySort = (q) => {
    const s = sort && Object.keys(sort).length ? sort : (opts == null ? void 0 : opts.fallbackSort) || {};
    const entries = Object.entries(s);
    if (!entries.length)
      return q;
    const [k, v] = entries[0];
    return q.orderBy(k, v === -1 ? "desc" : "asc");
  };
  try {
    query = applySort(query);
  } catch {
  }
  let total = 0;
  try {
    const c = await ((opts == null ? void 0 : opts.countQuery) || coll).count();
    total = (c.total ?? c.count) || 0;
  } catch {
  }
  const res = await query.skip((page - 1) * pageSize).limit(pageSize).get();
  const items = res && res.data || [];
  const hasMore = page * pageSize < total;
  return { items, meta: { total, hasMore } };
};

// index.ts
import_wx_server_sdk2.default.init({ env: import_wx_server_sdk2.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk2.default.database();
var CreateSchema = import_zod.z.object({
  type: import_zod.z.enum(["statsMonthly", "statsAnnual", "custom"]).default("statsMonthly"),
  params: import_zod.z.record(import_zod.z.any()).default({}),
  clientToken: import_zod.z.string().optional(),
  requestId: import_zod.z.string().optional()
});
var StatusSchema = import_zod.z.object({ taskId: import_zod.z.string().min(1), requestId: import_zod.z.string().optional() });
var HistorySchema = import_zod.z.object({
  page: import_zod.z.number().int().min(1).default(1),
  pageSize: import_zod.z.number().int().min(1).max(100).default(20)
});
var main = async (event) => {
  var _a, _b, _c, _d, _e, _f;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    const allowed = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
    if (!allowed)
      return err("E_PERM", "\u9700\u8981\u6743\u9650");
    const started = Date.now();
    const reqId = payload && payload.requestId || null;
    if (action === "create") {
      const p = CreateSchema.safeParse(payload || {});
      if (!p.success)
        return errValidate("\u53C2\u6570\u4E0D\u5408\u6CD5", p.error.issues);
      if (p.data.clientToken) {
        const existed = await db.collection("ExportTasks").where({ clientToken: p.data.clientToken }).limit(1).get();
        if ((_c = existed == null ? void 0 : existed.data) == null ? void 0 : _c.length) {
          const task2 = existed.data[0];
          try {
            await db.collection("AuditLogs").add({ data: { actorId: OPENID || null, action: "exports.create", target: { taskId: task2._id, type: task2.type }, requestId: p.data.requestId || null, createdAt: Date.now() } });
          } catch {
          }
          return ok({ taskId: task2._id });
        }
      }
      const now = Date.now();
      const task = { type: p.data.type, params: p.data.params || {}, status: "pending", retries: 0, maxRetries: 3, createdBy: OPENID || null, createdAt: now, clientToken: p.data.clientToken || null };
      const r = await db.collection("ExportTasks").add({ data: task });
      try {
        await db.collection("AuditLogs").add({ data: { actorId: OPENID || null, action: "exports.create", target: { taskId: r._id, type: p.data.type }, requestId: p.data.requestId || null, createdAt: now } });
      } catch {
      }
      return ok({ taskId: r._id });
    }
    if (action === "status") {
      const p = StatusSchema.safeParse(payload || {});
      if (!p.success)
        return errValidate("\u53C2\u6570\u4E0D\u5408\u6CD5", p.error.issues);
      const taskId = p.data.taskId;
      const r = await db.collection("ExportTasks").doc(taskId).get();
      if (!(r == null ? void 0 : r.data))
        return err("E_NOT_FOUND", "task not found");
      const t = r.data;
      if (t.status === "pending" || t.status === "running") {
        const now = Date.now();
        const expAt = now + 30 * 60 * 1e3;
        const month = ((_d = t == null ? void 0 : t.params) == null ? void 0 : _d.month) || "current";
        const type = String((t == null ? void 0 : t.type) || "statsMonthly");
        const fakeUrl = `https://example.com/download/${type}-${month}.xlsx`;
        await db.collection("ExportTasks").doc(taskId).update({ data: { status: "done", downloadUrl: fakeUrl, expiresAt: expAt, updatedAt: now } });
        t.status = "done";
        t.downloadUrl = fakeUrl;
        t.expiresAt = expAt;
      }
      try {
        await db.collection("AuditLogs").add({ data: { actorId: OPENID || null, action: "export.status", target: { taskId, status: t.status }, requestId: p.data.requestId || null, createdAt: Date.now() } });
      } catch {
      }
      const out = { status: t.status, downloadUrl: t.downloadUrl, expiresAt: t.expiresAt };
      try {
        await db.collection("Metrics").add({ data: { ns: "exports", action: "status", ok: true, duration: Date.now() - started, requestId: reqId, actorId: OPENID || null, ts: Date.now() } });
      } catch {
      }
      return ok(out);
    }
    if (action === "history") {
      const qp = HistorySchema.safeParse(payload || {});
      if (!qp.success)
        return errValidate("\u53C2\u6570\u4E0D\u5408\u6CD5", qp.error.issues);
      const { page, pageSize } = qp.data;
      const where = { createdBy: OPENID || null };
      const base = db.collection("ExportTasks").where(where);
      const { items, meta } = await paginate(base, { page, pageSize, sort: { createdAt: -1 } }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection("ExportTasks").where(where) });
      const total = meta && meta.total || 0;
      const hasMore = (meta && meta.hasMore) != null ? meta.hasMore : page * pageSize < total;
      return ok({ items, hasMore });
    }
    if (action === "cronCleanup") {
      const now = Date.now();
      try {
        const _ = db.command;
        const res = await db.collection("ExportTasks").where({ status: "done", expiresAt: _.lt(now) }).get();
        const tasks = (res == null ? void 0 : res.data) || [];
        for (const it of tasks) {
          try {
            await db.collection("ExportTasks").doc(it._id).update({ data: { downloadUrl: null, expiresAt: null, updatedAt: now } });
          } catch {
          }
        }
      } catch {
      }
      try {
        await db.collection("Metrics").add({ data: { ns: "exports", action: "cronCleanup", ok: true, duration: Date.now() - started, requestId: reqId, actorId: OPENID || null, ts: Date.now() } });
      } catch {
      }
      return ok({ cleaned: true, ts: now });
    }
    try {
      await db.collection("Metrics").add({ data: { ns: "exports", action: action || "ping", ok: true, duration: Date.now() - started, requestId: reqId, actorId: OPENID || null, ts: Date.now() } });
    } catch {
    }
    return ok({ ping: "exports" });
  } catch (e) {
    try {
      const { action, payload } = event || {};
      const reqId = payload && payload.requestId || null;
      const { OPENID } = ((_f = (_e = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _f.call(_e)) || {};
      await db.collection("Metrics").add({ data: { ns: "exports", action: action || "unknown", ok: false, code: e.code || "E_INTERNAL", message: String(e.message || ""), ts: Date.now(), actorId: OPENID || null, requestId: reqId } });
    } catch {
    }
    return err(e.code || "E_INTERNAL", e.message, e.stack);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
//# sourceMappingURL=index.js.map