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
var services_exports = {};
__export(services_exports, {
  main: () => main
});
module.exports = __toCommonJS(services_exports);
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));
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
var ServicesListSchema = import_zod.z.object({
  page: import_zod.z.number().int().min(1).default(1),
  pageSize: import_zod.z.number().int().min(1).max(100).default(10),
  filter: import_zod.z.object({
    patientId: import_zod.z.string().min(1).max(64).optional(),
    createdBy: import_zod.z.string().min(1).max(128).optional(),
    type: import_zod.z.enum(["visit", "psych", "goods", "referral", "followup"]).optional(),
    status: import_zod.z.enum(["review", "approved", "rejected"]).optional()
  }).partial().optional(),
  sort: import_zod.z.record(import_zod.z.string(), import_zod.z.union([import_zod.z.literal(1), import_zod.z.literal(-1)])).optional()
});
var ServiceCreateSchema = import_zod.z.object({
  patientId: import_zod.z.string(),
  type: import_zod.z.enum(["visit", "psych", "goods", "referral", "followup"]),
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  desc: import_zod.z.string().max(500).optional(),
  images: import_zod.z.array(import_zod.z.string()).max(9).optional()
});
var ServiceReviewSchema = import_zod.z.object({
  id: import_zod.z.string(),
  decision: import_zod.z.enum(["approved", "rejected"]),
  reason: import_zod.z.string().min(20).max(200).optional()
});

// index.ts
import_wx_server_sdk.default.init({ env: import_wx_server_sdk.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk.default.database();
var IdSchema = import_zod2.z.object({ id: import_zod2.z.string() });
var main = async (event) => {
  var _a, _b, _c, _d, _e, _f;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
    const canReview = async () => await isRole(db, OPENID, "admin") || await isRole(db, OPENID, "social_worker");
    switch (action) {
      case "list": {
        const qp = ServicesListSchema.parse(payload || {});
        const { OPENID: OPENID2 } = ((_d = (_c = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _d.call(_c)) || {};
        let query = {};
        if (qp.filter) {
          const f = qp.filter;
          if (f.patientId)
            query.patientId = f.patientId;
          if (f.createdBy)
            query.createdBy = f.createdBy === "me" && OPENID2 ? OPENID2 : f.createdBy;
          if (f.type)
            query.type = f.type;
          if (f.status)
            query.status = f.status;
        }
        let coll = db.collection("Services").where(query);
        if (qp.sort && Object.keys(qp.sort).length) {
          const [k, v] = Object.entries(qp.sort)[0];
          coll = coll.orderBy(k, v === -1 ? "desc" : "asc");
        } else {
          coll = coll.orderBy("date", "desc");
        }
        const res = await coll.skip((qp.page - 1) * qp.pageSize).limit(qp.pageSize).get();
        return ok(res.data);
      }
      case "get": {
        const { id } = IdSchema.parse(payload || {});
        const r = await db.collection("Services").doc(id).get();
        if (!(r == null ? void 0 : r.data))
          return err("E_NOT_FOUND", "service not found");
        return ok(r.data);
      }
      case "create": {
        const parsed = ServiceCreateSchema.safeParse((payload == null ? void 0 : payload.service) || payload || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const s = parsed.data;
        const clientToken = payload && payload.clientToken || null;
        const { OPENID: OPENID2 } = ((_f = (_e = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _f.call(_e)) || {};
        if (clientToken) {
          const existed = await db.collection("Services").where({ clientToken }).limit(1).get();
          if (existed.data && existed.data.length) {
            return ok({ _id: existed.data[0]._id });
          }
        }
        const doc = { ...s, status: "review", createdBy: OPENID2 || null, createdAt: Date.now(), ...clientToken ? { clientToken } : {} };
        const { _id } = await db.collection("Services").add({ data: doc });
        return ok({ _id });
      }
      case "review": {
        const { id, decision, reason } = ServiceReviewSchema.parse(payload || {});
        if (!await canReview())
          return err("E_PERM", "\u9700\u8981\u5BA1\u6838\u6743\u9650");
        if (decision === "rejected" && !reason)
          return errValidate("\u5BA1\u6838\u9A73\u56DE\u9700\u586B\u5199\u7406\u7531");
        const r = await db.collection("Services").doc(id).get();
        const cur = r == null ? void 0 : r.data;
        if (!cur)
          return err("E_NOT_FOUND", "service not found");
        if (cur.status !== "review")
          return err("E_CONFLICT", "\u5F53\u524D\u72B6\u6001\u4E0D\u53EF\u5BA1\u6838");
        await db.collection("Services").doc(id).update({ data: { status: decision, reviewReason: reason || null, reviewedAt: Date.now() } });
        try {
          await db.collection("AuditLogs").add({ data: { actorId: OPENID || null, action: "services.review", target: { id, decision }, createdAt: Date.now() } });
        } catch {
        }
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