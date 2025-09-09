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
var activities_exports = {};
__export(activities_exports, {
  main: () => main
});
module.exports = __toCommonJS(activities_exports);
var import_wx_server_sdk2 = __toESM(require("wx-server-sdk"));
var import_zod2 = require("zod");

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

// ../packages/core-utils/validation.ts
var mapZodIssues = (issues) => {
  const first = issues && issues[0];
  const path = first && (first.path || []).join(".") || "";
  let msg = (first == null ? void 0 : first.message) || "\u586B\u5199\u6709\u8BEF";
  if (/reason/.test(path))
    msg = "\u8BF7\u586B\u5199\u7533\u8BF7\u7406\u7531\uFF08\u4E0D\u5C11\u4E8E20\u5B57\uFF09";
  else if (/fields/.test(path))
    msg = "\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u5B57\u6BB5";
  else if (/patientId/.test(path))
    msg = "\u7F3A\u5C11 patientId";
  else if (/expiresDays/.test(path))
    msg = "\u6709\u6548\u671F\u4E0D\u5408\u6CD5";
  else if (/expiresAt/.test(path))
    msg = "\u6709\u6548\u671F\u65F6\u95F4\u4E0D\u5408\u6CD5";
  else if (/status$/.test(path))
    msg = "\u72B6\u6001\u4E0D\u5408\u6CD5";
  else if (/page(Size)?$/.test(path))
    msg = "\u5206\u9875\u53C2\u6570\u4E0D\u5408\u6CD5";
  if (/id_card/.test(path))
    msg = "\u8EAB\u4EFD\u8BC1\u683C\u5F0F\u6216\u6821\u9A8C\u4F4D\u9519\u8BEF";
  else if (/phone/.test(path))
    msg = "\u624B\u673A\u53F7\u683C\u5F0F\u9519\u8BEF";
  else if (/birthDate/.test(path))
    msg = "\u51FA\u751F\u65E5\u671F\u683C\u5F0F\u9519\u8BEF";
  else if (/date$/.test(path))
    msg = "\u65E5\u671F\u683C\u5F0F\u4E0D\u6B63\u786E";
  else if (/capacity/.test(path))
    msg = "\u5BB9\u91CF\u9700\u4E3A \u22650 \u7684\u6574\u6570";
  else if (/title/.test(path))
    msg = "\u6807\u9898\u9700 2\u201340 \u5B57";
  else if (/location/.test(path))
    msg = "\u5730\u70B9\u9700 \u226480 \u5B57";
  else if (/type/.test(path))
    msg = "\u7C7B\u578B\u4E0D\u5408\u6CD5";
  else if (/images/.test(path))
    msg = "\u56FE\u7247\u6570\u91CF\u6216\u683C\u5F0F\u4E0D\u5408\u6CD5";
  return { field: path || void 0, msg };
};

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});
var errValidate = (msg, details) => err("E_VALIDATE", msg, details);

// schema.ts
var import_zod = require("zod");
var ActivitiesListSchema = import_zod.z.object({
  page: import_zod.z.number().int().min(1).default(1),
  pageSize: import_zod.z.number().int().min(1).max(100).default(10),
  filter: import_zod.z.object({
    status: import_zod.z.enum(["open", "ongoing", "done", "closed"]).optional(),
    from: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }).partial().optional(),
  sort: import_zod.z.record(import_zod.z.string(), import_zod.z.union([import_zod.z.literal(1), import_zod.z.literal(-1)])).optional()
});
var ActivityCreateSchema = import_zod.z.object({
  title: import_zod.z.string().min(2).max(40),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: import_zod.z.string().min(1).max(80),
  capacity: import_zod.z.number().int().min(0),
  status: import_zod.z.enum(["open", "ongoing", "done", "closed"]).default("open"),
  description: import_zod.z.string().max(500).optional()
});

// index.ts
import_wx_server_sdk2.default.init({ env: import_wx_server_sdk2.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk2.default.database();
var IdSchema = import_zod2.z.object({ id: import_zod2.z.string() });
var main = async (event) => {
  var _a, _b;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    const canCreate = async () => hasAnyRole(db, OPENID, ["admin", "social_worker"]);
    switch (action) {
      case "list": {
        const qp = ActivitiesListSchema.parse(payload || {});
        const _ = db.command;
        let query = {};
        if (qp.filter) {
          const f = qp.filter;
          if (f.status)
            query.status = f.status;
          if (f.from || f.to) {
            const range = {};
            if (f.from)
              range[_.gte] = f.from;
            if (f.to)
              range[_.lte] = f.to;
            query.date = range;
          }
        }
        const base = db.collection("Activities").where(query);
        const { items, meta } = await paginate(base, { page: qp.page, pageSize: qp.pageSize, sort: qp.sort }, { fallbackSort: { date: -1 }, countQuery: db.collection("Activities").where(query) });
        return ok({ items, meta });
      }
      case "get": {
        const pld = payload || {};
        const id = (pld && (pld.id || pld.activityId)) || (function(){ try { return IdSchema.parse(pld).id } catch { return null } })();
        if (!id) return err("E_VALIDATE","missing id");
        const r = await db.collection("Activities").doc(String(id)).get();
        if (!(r == null ? void 0 : r.data))
          return err("E_NOT_FOUND", "activity not found");
        return ok(r.data);
      }
      case "create": {
        if (!await canCreate())
          return err("E_PERM", "\u4EC5\u7BA1\u7406\u5458/\u793E\u5DE5\u53EF\u53D1\u5E03\u6D3B\u52A8");
        const parsed = ActivityCreateSchema.safeParse((payload == null ? void 0 : payload.activity) || payload || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const a = parsed.data;
        const doc = { ...a, createdAt: Date.now() };
        const { _id } = await db.collection("Activities").add({ data: doc });
        return ok({ _id });
      }
      case "update": {
        // RBAC
        if (!await canCreate()) return err("E_PERM","\u4EC5\u7BA1\u7406\u5458/\u793E\u5DE5\u53EF\u66F4\u65B0\u6D3B\u52A8");
        const pld = payload || {};
        const id = (pld && (pld.id || pld.activityId)) || null;
        const patch = (pld && (pld.patch || pld.data)) || {};
        if (!id || typeof patch !== 'object') return err("E_VALIDATE","invalid args");
        const clean = {};
        Object.keys(patch || {}).forEach(k => { if (patch[k] !== void 0) clean[k] = patch[k]; });
        if (!Object.keys(clean).length) return ok({ updated: 0 });
        await db.collection('Activities').doc(String(id)).update({ data: { ...clean, updatedAt: Date.now() } });
        try { await db.collection('AuditLogs').add({ data: { actorId: OPENID || null, action: 'activities.update', target: { id: String(id) }, createdAt: Date.now() } }) } catch {}
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
