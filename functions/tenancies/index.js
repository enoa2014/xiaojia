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
var tenancies_exports = {};
__export(tenancies_exports, {
  main: () => main
});
module.exports = __toCommonJS(tenancies_exports);
var import_wx_server_sdk2 = __toESM(require("wx-server-sdk"));
var import_zod = require("zod");

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});
var errValidate = (msg, details) => err("E_VALIDATE", msg, details);

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

// ../packages/core-rbac/index.ts
var isRole = async (db2, openId, role) => {
  var _a, _b, _c;
  if (!openId)
    return false;
  try {
    const _2 = db2.command;
    const byOpenId = await db2.collection("Users").where({ openId, role }).limit(1).get();
    if ((_a = byOpenId == null ? void 0 : byOpenId.data) == null ? void 0 : _a.length)
      return true;
    const byId = await db2.collection("Users").where({ _id: openId, role }).limit(1).get();
    if ((_b = byId == null ? void 0 : byId.data) == null ? void 0 : _b.length)
      return true;
    const byRoles = await db2.collection("Users").where({ openId, roles: _2.in([role]) }).limit(1).get();
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

// index.ts
import_wx_server_sdk2.default.init({ env: import_wx_server_sdk2.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk2.default.database();
var _ = db.command;
var PaginationSchema = import_zod.z.object({
  page: import_zod.z.number().int().min(1).default(1),
  pageSize: import_zod.z.number().int().min(1).max(100).default(20)
});
var ListSchema = PaginationSchema.extend({
  filter: import_zod.z.object({
    patientId: import_zod.z.string().optional(),
    id_card: import_zod.z.string().optional(),
    room: import_zod.z.string().optional(),
    bed: import_zod.z.string().optional(),
    checkInDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "\u65E5\u671F\u683C\u5F0F\u4E0D\u6B63\u786E").optional()
  }).partial().optional()
});
var TenancyCreateSchema = import_zod.z.object({
  patientId: import_zod.z.string().optional(),
  id_card: import_zod.z.string().optional(),
  checkInDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  room: import_zod.z.string().optional(),
  bed: import_zod.z.string().optional(),
  subsidy: import_zod.z.number().min(0).optional(),
  extra: import_zod.z.object({ admitPersons: import_zod.z.string().optional() }).partial().optional()
}).refine((v) => !!(v.patientId || v.id_card), { message: "patientId \u6216 id_card \u5FC5\u586B" });
var UpdateSchema = import_zod.z.object({ id: import_zod.z.string(), patch: import_zod.z.object({ checkOutDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) });
var main = async (event) => {
  var _a, _b, _c, _d, _e;
  try {
    const action = event && event.action;
    const { OPENID } = ((_b = (_a = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    const isManager = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
    switch (action) {
      case "list": {
        if (!isManager)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
        const parsed = ListSchema.safeParse((event == null ? void 0 : event.payload) || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const { page, pageSize, filter } = parsed.data;
        const query = {};
        if (filter) {
          if (filter.patientId)
            query.patientId = filter.patientId;
          if (filter.id_card)
            query.id_card = filter.id_card;
          if (filter.room)
            query.room = filter.room;
          if (filter.bed)
            query.bed = filter.bed;
          if (filter.checkInDate)
            query.checkInDate = filter.checkInDate;
        }
        let coll = db.collection("Tenancies");
        if (Object.keys(query).length)
          coll = coll.where(query);
        const { items } = await paginate(coll, { page, pageSize, sort: void 0 }, { fallbackSort: { checkInDate: -1 }, countQuery: db.collection("Tenancies").where(query || {}) });
        return ok(items);
      }
      case "create": {
        if (!isManager)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
        const payload = (event == null ? void 0 : event.payload) || {};
        const body = payload.tenancy || payload;
        const parsed = TenancyCreateSchema.safeParse(body || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const t = parsed.data;
        if (t.checkOutDate && t.checkOutDate < t.checkInDate) {
          return errValidate("\u9000\u4F4F\u65E5\u671F\u4E0D\u80FD\u65E9\u4E8E\u5165\u4F4F\u65E5\u671F");
        }
        const clientToken = payload && payload.clientToken || null;
        if (clientToken) {
          const existed = await db.collection("Tenancies").where({ clientToken }).limit(1).get();
          if ((_c = existed == null ? void 0 : existed.data) == null ? void 0 : _c.length)
            return ok({ _id: existed.data[0]._id });
        }
        const doc = { ...t, createdAt: Date.now(), ...clientToken ? { clientToken } : {} };
        const addRes = await db.collection("Tenancies").add({ data: doc });
        return ok({ _id: addRes._id });
      }
      case "update": {
        if (!isManager)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
        const parsed = UpdateSchema.safeParse((event == null ? void 0 : event.payload) || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const { id, patch } = parsed.data;
        const r = await db.collection("Tenancies").doc(String(id)).get();
        const cur = r && r.data;
        if (!cur)
          return err("E_NOT_FOUND", "tenancy not found");
        if (cur.checkOutDate)
          return err("E_CONFLICT", "\u5F53\u524D\u8BB0\u5F55\u5DF2\u9000\u4F4F");
        const inDate = cur.checkInDate ? String(cur.checkInDate) : null;
        if (inDate && patch.checkOutDate < inDate)
          return errValidate("\u9000\u4F4F\u65E5\u671F\u4E0D\u80FD\u65E9\u4E8E\u5165\u4F4F\u65E5\u671F");
        try {
          const latest = await db.collection("Tenancies").where({ ...cur.patientId ? { patientId: String(cur.patientId) } : cur.id_card ? { id_card: String(cur.id_card) } : {}, checkOutDate: _.eq(null) }).orderBy("checkInDate", "desc").limit(1).get();
          const latestDoc = (_d = latest == null ? void 0 : latest.data) == null ? void 0 : _d[0];
          if (!latestDoc || String(latestDoc._id) !== String(id)) {
            return err("E_CONFLICT", "\u4EC5\u5141\u8BB8\u6700\u8FD1\u672A\u9000\u4F4F\u8BB0\u5F55\u9000\u4F4F");
          }
        } catch {
          return err("E_CONFLICT", "\u4EC5\u5141\u8BB8\u6700\u8FD1\u672A\u9000\u4F4F\u8BB0\u5F55\u9000\u4F4F");
        }
        const upd = await db.collection("Tenancies").where({ _id: String(id), checkOutDate: _.eq(null) }).update({ data: { checkOutDate: patch.checkOutDate } });
        const updated = upd && (upd.updated || upd.stats && upd.stats.updated) || 0;
        if (!updated)
          return err("E_CONFLICT", "\u5F53\u524D\u8BB0\u5F55\u5DF2\u9000\u4F4F");
        return ok({ updated });
      }
      case "get": {
        if (!isManager)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
        const id = String(((_e = event == null ? void 0 : event.payload) == null ? void 0 : _e.id) || "");
        if (!id)
          return err("E_VALIDATE", "\u7F3A\u5C11 id");
        const r = await db.collection("Tenancies").doc(id).get();
        if (!(r == null ? void 0 : r.data))
          return err("E_NOT_FOUND", "tenancy not found");
        return ok(r.data);
      }
      case "db.ping": {
        let alive = false;
        try {
          await db.collection("Patients").limit(1).get();
          alive = true;
        } catch {
          alive = true;
        }
        return ok({ ping: "db", alive, ts: Date.now() });
      }
      default:
        return ok({ echo: event || null, ts: Date.now() });
    }
  } catch (e) {
    return err(e.code || "E_INTERNAL", e.message);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
//# sourceMappingURL=index.js.map