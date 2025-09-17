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

// ../packages/core-auth/index.ts
var import_crypto = __toESM(require("crypto"));
var DEFAULT_ITERATIONS = 64e3;
var KEYLEN = 64;
var DIGEST = "sha512";
var hashPassword = (password, iterations = DEFAULT_ITERATIONS) => {
  if (typeof password !== "string" || password.length === 0)
    throw new Error("empty password");
  const salt = import_crypto.default.randomBytes(16);
  const derived = import_crypto.default.pbkdf2Sync(password, salt, iterations, KEYLEN, DIGEST);
  return `pbkdf2$${iterations}$${salt.toString("base64")}$${derived.toString("base64")}`;
};
var verifyPassword = (password, stored) => {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2")
      return false;
    const iterations = parseInt(parts[1], 10);
    const salt = Buffer.from(parts[2], "base64");
    const hash = Buffer.from(parts[3], "base64");
    const derived = import_crypto.default.pbkdf2Sync(password, salt, iterations, hash.length, DIGEST);
    return import_crypto.default.timingSafeEqual(hash, derived);
  } catch (_) {
    return false;
  }
};
var needsRehash = (stored, targetIterations = DEFAULT_ITERATIONS) => {
  try {
    const parts = String(stored || "").split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2")
      return true;
    const iterations = parseInt(parts[1], 10);
    return iterations < targetIterations;
  } catch (_) {
    return true;
  }
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
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    const ensureCollection = async (name) => {
      try {
        await db.createCollection(name);
      } catch (_) {
      }
    };
    const setDocSafe = async (collection, id, data) => {
      const copy = { ...data || {} };
      try {
        delete copy._id;
      } catch (_) {
      }
      return db.collection(collection).doc(id).set({ data: copy });
    };
    switch (action) {
      case "login": {
        await ensureCollection("AuthAccounts");
        const Schema = import_zod.z.object({ username: import_zod.z.string().min(3).max(50), password: import_zod.z.string().min(6).max(100) });
        const { username, password } = Schema.parse(payload || {});
        const accSnap = await db.collection("AuthAccounts").where({ username }).limit(1).get();
        const account = (_c = accSnap == null ? void 0 : accSnap.data) == null ? void 0 : _c[0];
        if (!account || !verifyPassword(password, account.passwordHash)) {
          return err("E_AUTH", "\u6635\u79F0/\u59D3\u540D\u6216\u5BC6\u7801\u9519\u8BEF");
        }
        if (account.status !== "active") {
          if (account.status === "pending") {
            return err("E_AUTH", "\u8D26\u53F7\u6B63\u5728\u5BA1\u6279\u4E2D\uFF0C\u8BF7\u7B49\u5F85\u7BA1\u7406\u5458\u5BA1\u6838");
          } else {
            return err("E_AUTH", "\u8D26\u53F7\u5DF2\u88AB\u7981\u7528");
          }
        }
        try {
          if (needsRehash(account.passwordHash)) {
            const nextHash = hashPassword(password);
            await db.collection("AuthAccounts").doc(account._id).update({ data: { passwordHash: nextHash, updatedAt: Date.now() } });
          }
        } catch (_) {
        }
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const role = account.role || "admin";
        let docId = null;
        let existing = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_d = byOpen.data) == null ? void 0 : _d.length) {
            existing = byOpen.data[0];
            docId = existing._id;
          }
        } catch {
        }
        if (!docId) {
          try {
            const byId = await db.collection("Users").doc(OPENID).get();
            if (byId == null ? void 0 : byId.data) {
              existing = byId.data;
              docId = OPENID;
            }
          } catch {
          }
        }
        const now = Date.now();
        const data = { ...existing || {}, openId: OPENID, role, roles: [role], status: "active", updatedAt: now, createdAt: (existing == null ? void 0 : existing.createdAt) || now };
        if (docId)
          await setDocSafe("Users", docId, data);
        else {
          const r = await db.collection("Users").add({ data });
          docId = r._id;
        }
        try {
          await db.collection("AuditLogs").add({ data: { action: "auth_login", actorId: OPENID, boundRole: role, createdAt: now } });
        } catch {
        }
        return ok({ user: { openId: OPENID, role, roles: [role], status: "active", name: data.name || null, avatar: data.avatar || null } });
      }
      case "registerAuth": {
        await ensureCollection("AuthAccounts");
        const Schema = import_zod.z.object({
          username: import_zod.z.string().min(3).max(30).regex(/^[a-zA-Z][a-zA-Z0-9_\-]{2,29}$/),
          password: import_zod.z.string().min(6).max(100),
          role: import_zod.z.enum(["admin", "social_worker"]).default("social_worker")
        });
        const input = Schema.parse(payload || {});
        const admins = await db.collection("AuthAccounts").where({ role: "admin" }).limit(1).get();
        const hasAdmin = Array.isArray(admins == null ? void 0 : admins.data) && admins.data.length > 0;
        if (hasAdmin) {
          if (!OPENID)
            return err("E_AUTH", "\u672A\u767B\u5F55");
          const allowed = await hasAnyRole(db, OPENID, ["admin"]);
          if (!allowed)
            return err("E_PERM", "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650");
        } else {
          if (input.role !== "admin") {
            if (!OPENID)
              return err("E_AUTH", "\u672A\u767B\u5F55");
            const allowed = await hasAnyRole(db, OPENID, ["admin"]);
            if (!allowed)
              return err("E_PERM", "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650");
          }
        }
        const dup = await db.collection("AuthAccounts").where({ username: input.username }).limit(1).get();
        if ((_e = dup == null ? void 0 : dup.data) == null ? void 0 : _e.length)
          return err("E_CONFLICT", "\u7528\u6237\u540D\u5DF2\u5B58\u5728");
        const now = Date.now();
        const passwordHash = hashPassword(input.password);
        const doc = { username: input.username, passwordHash, role: input.role, createdAt: now, updatedAt: now };
        const r = await db.collection("AuthAccounts").add({ data: doc });
        try {
          await db.collection("AuditLogs").add({ data: { action: "auth_register", actorId: OPENID || null, username: input.username, role: input.role, createdAt: now } });
        } catch {
        }
        return ok({ _id: r._id, username: input.username, role: input.role });
      }
      case "getProfile": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        let doc = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_f = byOpen.data) == null ? void 0 : _f.length)
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
        const doc = ((_g = docRes == null ? void 0 : docRes.data) == null ? void 0 : _g[0]) || null;
        const id = doc && doc._id || targetId;
        if (p.decision === "approve") {
          if (!p.role)
            return errValidate("\u901A\u8FC7\u5BA1\u6279\u9700\u6307\u5B9A\u89D2\u8272");
          const patch = { status: "active", role: p.role, roles: [p.role], updatedAt: Date.now() };
          await db.collection("Users").doc(id).update({ data: patch });
          try {
            await db.collection("AuthAccounts").where({ openId: targetId }).update({
              data: { status: "active", role: p.role, updatedAt: Date.now() }
            });
          } catch (e) {
            console.warn("Failed to activate auth account:", e);
          }
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
        const isTestMode = !!(event && event.payload && (event.payload.test === true || event.payload.test === 1 || event.payload.test === "1"));
        const RelativeSchema = import_zod.z.object({
          patientName: import_zod.z.string().min(1).max(50),
          relation: import_zod.z.enum(["father", "mother", "guardian", "other"]),
          patientIdCard: import_zod.z.string().regex(/^[0-9]{17}[0-9Xx]$/)
        });
        const RegisterSchema = import_zod.z.object({
          nickname: import_zod.z.string().max(30).optional(),
          password: import_zod.z.string().min(6).max(100),
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
        await ensureCollection("AuthAccounts");
        await ensureCollection("Users");
        await ensureCollection("AuditLogs");
        const loginName = ((_h = input.nickname) == null ? void 0 : _h.trim()) || input.name;
        const nameCheck = await db.collection("AuthAccounts").where({ username: loginName }).limit(1).get();
        if ((_i = nameCheck == null ? void 0 : nameCheck.data) == null ? void 0 : _i.length) {
          return err("E_CONFLICT", `${input.nickname ? "\u6635\u79F0" : "\u59D3\u540D"} "${loginName}" \u5DF2\u88AB\u4F7F\u7528\uFF0C\u8BF7\u6362\u4E00\u4E2A`);
        }
        let doc = null;
        let docId = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_j = byOpen.data) == null ? void 0 : _j.length) {
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
        try {
          await db.collection("AuditLogs").add({ data: { action: "user_register_attempt", actorId: OPENID, test: !!isTestMode, createdAt: now } });
        } catch {
        }
        const isAdminOpenId = !!(doc && (doc.role === "admin" || Array.isArray(doc.roles) && doc.roles.includes("admin")));
        const targetOpenId = isAdminOpenId && isTestMode ? `test:${OPENID}:${now}` : OPENID;
        if (isAdminOpenId && !isTestMode) {
          return err("E_CONFLICT", "\u5F53\u524D\u5FAE\u4FE1\u5DF2\u7ED1\u5B9A\u7BA1\u7406\u5458\uFF0C\u8BF7\u4F7F\u7528\u6D4B\u8BD5\u6CE8\u518C\u6A21\u5F0F\u6216\u66F4\u6362\u5FAE\u4FE1\u53F7");
        }
        const next = {
          ...doc || {},
          openId: targetOpenId,
          nickname: input.nickname || null,
          loginName,
          // 用于登录的名称
          name: input.name,
          phone: input.phone,
          id_card: input.id_card,
          applyRole: input.applyRole,
          relative: input.relative || null,
          status: "pending",
          isTest: isAdminOpenId && isTestMode ? true : void 0,
          updatedAt: now,
          createdAt: (doc == null ? void 0 : doc.createdAt) || now
        };
        if (doc && doc.status === "pending") {
          const same = doc.name === next.name && doc.phone === next.phone && doc.id_card === next.id_card && doc.applyRole === next.applyRole && JSON.stringify(doc.relative || null) === JSON.stringify(next.relative || null);
          if (same) {
            return ok({ status: "pending" });
          }
        }
        if (docId && targetOpenId === OPENID) {
          await setDocSafe("Users", docId, next);
        } else {
          await db.collection("Users").add({ data: next });
        }
        const passwordHash = hashPassword(input.password);
        const authAccount = {
          username: loginName,
          passwordHash,
          role: next.applyRole,
          // 使用申请的角色
          status: "pending",
          // 设为pending状态，审批通过后才能登录
          openId: targetOpenId,
          isTest: isAdminOpenId && isTestMode ? true : void 0,
          createdAt: now,
          updatedAt: now
        };
        await db.collection("AuthAccounts").add({ data: authAccount });
        try {
          await db.collection("AuditLogs").add({ data: { action: "user_register_submitted", actorId: OPENID, targetOpenId, createdAt: now } });
        } catch {
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
          if ((_k = byOpen.data) == null ? void 0 : _k.length)
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
          const r = await db.collection("Users").add({ data: { ...data } });
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
          if ((_l = byOpen.data) == null ? void 0 : _l.length)
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
          if ((_m = byOpen.data) == null ? void 0 : _m.length) {
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
        const data = { ...doc || {}, openId: OPENID, updatedAt: Date.now() };
        if (input.name != null) {
          data.name = input.name;
          data.displayName = input.name;
        }
        if (input.avatar != null) {
          data.avatar = input.avatar;
        }
        if (docId) {
          await setDocSafe("Users", docId, data);
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
          if ((_n = byOpen.data) == null ? void 0 : _n.length) {
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
        const data = { ...doc || {}, openId: OPENID, starredPatients: stars, updatedAt: Date.now() };
        if (docId) {
          await setDocSafe("Users", docId, data);
        } else {
          const r = await db2.collection("Users").add({ data });
          docId = r._id;
        }
        return ok({ stars });
      }
      case "logout": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        let doc = null;
        let docId = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_o = byOpen.data) == null ? void 0 : _o.length) {
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
        if (docId) {
          const data = { ...doc || {}, openId: OPENID, status: "logged_out", updatedAt: Date.now() };
          await setDocSafe("Users", docId, data);
          try {
            await db.collection("AuditLogs").add({ data: { action: "user_logout", actorId: OPENID, createdAt: Date.now() } });
          } catch {
          }
        }
        return ok({ success: true });
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