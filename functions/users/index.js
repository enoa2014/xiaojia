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
var users_exports = {};
__export(users_exports, {
  main: () => main
});
module.exports = __toCommonJS(users_exports);
var import_wx_server_sdk2 = __toESM(require("wx-server-sdk"));
var import_zod = require("zod");

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});
var errValidate = (msg, details) => err("E_VALIDATE", msg, details);

// ../packages/core-db/index.ts
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));
var getDB = () => {
  return import_wx_server_sdk.default.database();
};
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
import_wx_server_sdk2.default.init({ env: import_wx_server_sdk2.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk2.default.database();
var SetRoleSchema = import_zod.z.object({
  role: import_zod.z.enum(["admin", "social_worker", "volunteer", "parent"])
});
var SetProfileSchema = import_zod.z.object({
  name: import_zod.z.string().min(1).max(50).optional(),
  avatar: import_zod.z.string().min(1).max(10).optional()
}).refine((obj) => Object.keys(obj).length > 0, { message: "empty payload" });
var main = async (event) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    switch (action) {
      case "getProfile": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        let doc = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_c = byOpen.data) == null ? void 0 : _c.length)
            doc = byOpen.data[0];
        } catch {
        }
        if (!doc) {
          try {
            const byId = await db.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data)
              doc = byId.data;
          } catch {
          }
        }
        if (!doc)
          return ok({ openId: OPENID, role: null, roles: [], status: null });
        return ok({
          openId: OPENID,
          role: doc.role || null,
          roles: doc.roles || (doc.role ? [doc.role] : []),
          status: doc.status || null,
          name: doc.name || doc.displayName || null,
          avatar: doc.avatar || null
        });
      }
      case "listRegistrations": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const allowed = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
        if (!allowed)
          return err("E_PERM", "\u9700\u8981\u7BA1\u7406\u5458/\u793E\u5DE5\u6743\u9650");
        const Q = import_zod.z.object({ page: import_zod.z.number().int().min(1).default(1), pageSize: import_zod.z.number().int().min(1).max(100).default(20), status: import_zod.z.enum(["pending", "active", "rejected"]).default("pending") });
        const qp = Q.parse(payload || {});
        const base = db.collection("Users").where({ status: qp.status });
        const { items, meta } = await paginate(base, { page: qp.page, pageSize: qp.pageSize, sort: { createdAt: -1 } }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection("Users").where({ status: qp.status }) });
        const maskPhone = (p) => {
          if (!p)
            return null;
          return String(p).replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
        };
        const safeItems = items.map((u) => ({ openId: u.openId || u._id, name: u.name || null, phoneMasked: maskPhone(u.phone), applyRole: u.applyRole || null, relative: u.relative || null, status: u.status || null, createdAt: u.createdAt || null, updatedAt: u.updatedAt || null }));
        return ok({ items: safeItems, meta });
      }
      case "reviewRegistration": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const allowed = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
        if (!allowed)
          return err("E_PERM", "\u9700\u8981\u7BA1\u7406\u5458/\u793E\u5DE5\u6743\u9650");
        const ReviewSchema = import_zod.z.object({ openId: import_zod.z.string().min(1), decision: import_zod.z.enum(["approve", "reject"]), role: import_zod.z.enum(["volunteer", "parent"]).optional(), reason: import_zod.z.string().max(200).optional() });
        const p = ReviewSchema.parse(payload || {});
        const targetId = p.openId;
        const docRes = await db.collection("Users").where({ openId: targetId }).limit(1).get();
        const doc = ((_d = docRes == null ? void 0 : docRes.data) == null ? void 0 : _d[0]) || null;
        const id = doc && doc._id || targetId;
        if (p.decision === "approve") {
          if (!p.role)
            return errValidate("\u901A\u8FC7\u5BA1\u6279\u9700\u6307\u5B9A\u89D2\u8272");
          const patch = { status: "active", role: p.role, roles: [p.role], updatedAt: Date.now() };
          await db.collection("Users").doc(id).update({ data: patch });
          try {
            await db.collection("AuditLogs").add({ data: { action: "user_review", actorId: OPENID, targetOpenId: targetId, decision: "approve", role: p.role, createdAt: Date.now() } });
          } catch {
          }
          return ok({ openId: targetId, status: "active", role: p.role });
        } else {
          const patch = { status: "rejected", rejectReason: p.reason || "", updatedAt: Date.now() };
          await db.collection("Users").doc(id).update({ data: patch });
          try {
            await db.collection("AuditLogs").add({ data: { action: "user_review", actorId: OPENID, targetOpenId: targetId, decision: "reject", reason: p.reason || "", createdAt: Date.now() } });
          } catch {
          }
          return ok({ openId: targetId, status: "rejected" });
        }
      }
      case "register": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const RelativeSchema = import_zod.z.object({
          patientName: import_zod.z.string().min(1).max(50),
          relation: import_zod.z.enum(["father", "mother", "guardian", "other"]),
          patientIdCard: import_zod.z.string().regex(/^[0-9]{17}[0-9Xx]$/)
        });
        const RegisterSchema = import_zod.z.object({
          name: import_zod.z.string().min(2).max(30),
          phone: import_zod.z.string().regex(/^1\d{10}$/),
          id_card: import_zod.z.string().regex(/^[0-9]{17}[0-9Xx]$/),
          applyRole: import_zod.z.enum(["volunteer", "parent"]),
          relative: RelativeSchema.optional()
        }).refine((v) => v.applyRole !== "parent" || !!v.relative, { message: "\u4EB2\u5C5E\u9700\u586B\u5199\u5173\u8054\u60A3\u8005\u4FE1\u606F" });
        const parsed = RegisterSchema.safeParse(payload || {});
        if (!parsed.success) {
          return errValidate("\u53C2\u6570\u4E0D\u5408\u6CD5", parsed.error.issues);
        }
        const input = parsed.data;
        let doc = null;
        let docId = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_e = byOpen.data) == null ? void 0 : _e.length) {
            doc = byOpen.data[0];
            docId = doc._id;
          }
        } catch {
        }
        if (!doc) {
          try {
            const byId = await db.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data) {
              doc = byId.data;
              docId = OPENID;
            }
          } catch {
          }
        }
        const now = Date.now();
        const next = {
          ...doc || {},
          _id: docId || OPENID,
          openId: OPENID,
          name: input.name,
          phone: input.phone,
          id_card: input.id_card,
          applyRole: input.applyRole,
          relative: input.relative || null,
          status: "pending",
          updatedAt: now,
          createdAt: (doc == null ? void 0 : doc.createdAt) || now
        };
        if (doc && doc.status === "pending") {
          const same = doc.name === next.name && doc.phone === next.phone && doc.id_card === next.id_card && doc.applyRole === next.applyRole && JSON.stringify(doc.relative || null) === JSON.stringify(next.relative || null);
          if (same) {
            return ok({ status: "pending" });
          }
        }
        if (docId) {
          await db.collection("Users").doc(docId).set({ data: next });
        } else {
          await db.collection("Users").add({ data: next });
        }
        return ok({ status: "pending" });
      }
      case "setRole": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const { role } = SetRoleSchema.parse(payload || {});
        let docId = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_f = byOpen.data) == null ? void 0 : _f.length)
            docId = byOpen.data[0]._id;
        } catch {
        }
        if (!docId) {
          try {
            const byId = await db.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data)
              docId = OPENID;
          } catch {
          }
        }
        const data = { openId: OPENID, role, roles: [role], updatedAt: Date.now() };
        if (docId) {
          await db.collection("Users").doc(docId).set({ data: { ...data } });
        } else {
          const r = await db.collection("Users").add({ data: { _id: OPENID, ...data } });
          docId = r._id;
        }
        return ok({ _id: docId, role });
      }
      case "getStars": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const db2 = getDB();
        let doc = null;
        try {
          const byOpen = await db2.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_g = byOpen.data) == null ? void 0 : _g.length)
            doc = byOpen.data[0];
        } catch {
        }
        if (!doc) {
          try {
            const byId = await db2.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data)
              doc = byId.data;
          } catch {
          }
        }
        const stars = Array.isArray(doc == null ? void 0 : doc.starredPatients) ? doc.starredPatients : [];
        return ok({ stars });
      }
      case "setProfile": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const input = SetProfileSchema.parse(payload || {});
        let doc = null;
        let docId = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_h = byOpen.data) == null ? void 0 : _h.length) {
            doc = byOpen.data[0];
            docId = doc._id;
          }
        } catch {
        }
        if (!doc) {
          try {
            const byId = await db.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data) {
              doc = byId.data;
              docId = OPENID;
            }
          } catch {
          }
        }
        const data = { ...doc || {}, _id: docId || OPENID, openId: OPENID, updatedAt: Date.now() };
        if (input.name != null) {
          data.name = input.name;
          data.displayName = input.name;
        }
        if (input.avatar != null) {
          data.avatar = input.avatar;
        }
        if (docId) {
          await db.collection("Users").doc(docId).set({ data });
        } else {
          const r = await db.collection("Users").add({ data });
          docId = r._id;
        }
        return ok({ _id: docId, name: data.name || null, avatar: data.avatar || null });
      }
      case "toggleStar": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const ToggleSchema = import_zod.z.object({ patientId: import_zod.z.string(), value: import_zod.z.boolean().optional() });
        const { patientId, value } = ToggleSchema.parse(payload || {});
        const db2 = getDB();
        let doc = null;
        let docId = null;
        try {
          const byOpen = await db2.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_i = byOpen.data) == null ? void 0 : _i.length) {
            doc = byOpen.data[0];
            docId = doc._id;
          }
        } catch {
        }
        if (!doc) {
          try {
            const byId = await db2.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data) {
              doc = byId.data;
              docId = OPENID;
            }
          } catch {
          }
        }
        const existing = Array.isArray(doc == null ? void 0 : doc.starredPatients) ? doc.starredPatients : [];
        const set = new Set(existing);
        if (typeof value === "boolean") {
          if (value)
            set.add(patientId);
          else
            set.delete(patientId);
        } else {
          if (set.has(patientId))
            set.delete(patientId);
          else
            set.add(patientId);
        }
        const stars = Array.from(set);
        const data = { ...doc || {}, _id: docId || OPENID, openId: OPENID, starredPatients: stars, updatedAt: Date.now() };
        if (docId) {
          await db2.collection("Users").doc(docId).set({ data });
        } else {
          const r = await db2.collection("Users").add({ data });
          docId = r._id;
        }
        return ok({ stars });
      }
      default:
        return ok({ ping: "users", action });
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