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
var patients_exports = {};
__export(patients_exports, {
  main: () => main
});
module.exports = __toCommonJS(patients_exports);
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));
var import_zod2 = require("zod");

// schema.ts
var import_zod = require("zod");
var PatientsListSchema = import_zod.z.object({
  page: import_zod.z.number().int().min(1).default(1),
  pageSize: import_zod.z.number().int().min(1).max(100).default(10),
  filter: import_zod.z.object({
    name: import_zod.z.string().min(1).max(30).optional(),
    // 前缀匹配（不区分大小写）
    id_card_tail: import_zod.z.string().min(2).max(4).optional(),
    // 尾 2-4 位精确
    createdFrom: import_zod.z.number().optional(),
    createdTo: import_zod.z.number().optional()
  }).partial().optional(),
  sort: import_zod.z.record(import_zod.z.string(), import_zod.z.union([import_zod.z.literal(1), import_zod.z.literal(-1)])).optional()
});
var PatientCreateSchema = import_zod.z.object({
  name: import_zod.z.string().min(2).max(30),
  id_card: import_zod.z.string().regex(/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/),
  phone: import_zod.z.string().regex(/^1[3-9]\d{9}$/).optional(),
  birthDate: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: import_zod.z.string().optional(),
  nativePlace: import_zod.z.string().optional(),
  ethnicity: import_zod.z.string().optional(),
  hospital: import_zod.z.string().optional(),
  hospitalDiagnosis: import_zod.z.string().optional(),
  doctorName: import_zod.z.string().optional(),
  symptoms: import_zod.z.string().optional(),
  medicalCourse: import_zod.z.string().optional(),
  followupPlan: import_zod.z.string().optional(),
  motherName: import_zod.z.string().optional(),
  motherPhone: import_zod.z.string().regex(/^1[3-9]\d{9}$/).optional(),
  motherIdCard: import_zod.z.string().regex(/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/).optional(),
  otherGuardians: import_zod.z.string().optional(),
  familyEconomy: import_zod.z.string().optional()
});
var PatientUpdateSchema = import_zod.z.object({
  id: import_zod.z.string(),
  patch: PatientCreateSchema.partial()
});

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

// index.ts
import_wx_server_sdk.default.init({ env: import_wx_server_sdk.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk.default.database();
var _ = db.command;
function isValidChineseId(id) {
  const s = (id || "").toUpperCase().trim();
  if (!/^\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dX]$/.test(s))
    return false;
  const Wi = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const Val = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
  let sum = 0;
  for (let i = 0; i < 17; i++)
    sum += parseInt(s[i], 10) * Wi[i];
  const code = Val[sum % 11];
  return s[17] === code;
}
function notAfterToday(iso) {
  if (!iso)
    return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso))
    return false;
  const d = new Date(iso);
  if (isNaN(d.getTime()))
    return false;
  const today = /* @__PURE__ */ new Date();
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return d.getTime() <= t;
}
var main = async (event) => {
  var _a, _b, _c;
  try {
    const { action, payload } = event || {};
    switch (action) {
      case "list": {
        const parsedList = PatientsListSchema.safeParse(payload || {});
        if (!parsedList.success) {
          const m = mapZodIssues(parsedList.error.issues);
          return errValidate(m.msg, parsedList.error.issues);
        }
        const qp = parsedList.data;
        let query = {};
        if (qp.filter) {
          const f = qp.filter;
          if (f.name) {
            query.name = db.RegExp({ regexp: `^${f.name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}`, options: "i" });
          }
          if (f.id_card_tail) {
            query.id_card_tail = String(f.id_card_tail);
          }
          if (f.createdFrom || f.createdTo) {
            const range = {};
            if (f.createdFrom)
              range[_.gte] = f.createdFrom;
            if (f.createdTo)
              range[_.lte] = f.createdTo;
            query.createdAt = range;
          }
        }
        let coll = db.collection("Patients").where(query);
        if (qp.sort && Object.keys(qp.sort).length) {
          const [k, v] = Object.entries(qp.sort)[0];
          coll = coll.orderBy(k, v === -1 ? "desc" : "asc");
        } else {
          coll = coll.orderBy("createdAt", "desc");
        }
        let total = 0;
        try {
          const c = await db.collection("Patients").where(query).count();
          total = ((_a = c.total) != null ? _a : c.count) || 0;
        } catch {
        }
        const res = await coll.skip((qp.page - 1) * qp.pageSize).limit(qp.pageSize).get();
        const items = res.data;
        const hasMore = qp.page * qp.pageSize < total;
        return ok({ items, meta: { total, hasMore } });
      }
      case "get": {
        const parsed = import_zod2.z.object({ id: import_zod2.z.string() }).safeParse(payload || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const { id } = parsed.data;
        const r = await db.collection("Patients").doc(id).get();
        if (!(r == null ? void 0 : r.data))
          return err("E_NOT_FOUND", "patient not found");
        const patient = r.data;
        const { OPENID } = ((_c = (_b = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _c.call(_b)) || {};
        const now = Date.now();
        let approvedFields = /* @__PURE__ */ new Set();
        let minExpires = null;
        if (OPENID) {
          try {
            const _2 = db.command;
            const apr = await db.collection("PermissionRequests").where({ requesterId: OPENID, patientId: id, status: "approved", expiresAt: _2.gt(now) }).get();
            for (const pr of apr.data || []) {
              const fields = Array.isArray(pr.fields) ? pr.fields : [];
              fields.forEach((f) => approvedFields.add(f));
              const exp = pr.expiresAt;
              if (typeof exp === "number")
                minExpires = minExpires == null ? exp : Math.min(minExpires, exp);
            }
          } catch {
          }
        }
        const maskId = (s) => {
          const tail = patient.id_card_tail || (s ? s.replace(/\s/g, "").slice(-4) || null : null);
          return tail ? "************" + String(tail) : null;
        };
        const maskPhone = (p) => {
          if (!p)
            return null;
          const s = String(p);
          return s.length >= 4 ? "***" + s.slice(-4) : "***";
        };
        const out = { ...patient };
        const returnedFields = [];
        if (patient.id_card) {
          if (approvedFields.has("id_card")) {
            out.id_card = patient.id_card;
            returnedFields.push("id_card");
          } else {
            out.id_card = maskId(patient.id_card);
          }
        }
        if (patient.phone) {
          if (approvedFields.has("phone")) {
            out.phone = patient.phone;
            returnedFields.push("phone");
          } else {
            out.phone = maskPhone(patient.phone);
          }
        }
        const diag = patient.hospitalDiagnosis || patient.diagnosis || null;
        if (diag) {
          if (approvedFields.has("diagnosis")) {
            out.hospitalDiagnosis = diag;
            returnedFields.push("diagnosis");
          } else {
            const level = patient.diagnosisLevel || patient.diagnosis_enum || null;
            out.hospitalDiagnosis = level ? `\u8BCA\u65AD\u7EA7\u522B\uFF1A${level}` : "\u8BCA\u65AD\u4FE1\u606F\u5DF2\u8131\u654F";
          }
        }
        out.permission = {
          fields: Array.from(approvedFields),
          expiresAt: minExpires,
          hasSensitive: approvedFields.size > 0
        };
        if (OPENID && returnedFields.length) {
          try {
            await db.collection("AuditLogs").add({ data: {
              actorId: OPENID,
              action: "patients.readSensitive",
              target: { patientId: id, fields: returnedFields },
              timestamp: now
            } });
          } catch {
          }
        }
        return ok(out);
      }
      case "create": {
        const { patient, clientToken } = payload || {};
        const parsed = PatientCreateSchema.safeParse(patient || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const p = parsed.data;
        if (!isValidChineseId(p.id_card)) {
          return errValidate("\u8EAB\u4EFD\u8BC1\u683C\u5F0F\u6216\u6821\u9A8C\u4F4D\u9519\u8BEF");
        }
        if (p.birthDate && !notAfterToday(p.birthDate)) {
          return errValidate("\u51FA\u751F\u65E5\u671F\u9700\u65E9\u4E8E\u6216\u7B49\u4E8E\u4ECA\u65E5");
        }
        if (p.id_card) {
          const existed = await db.collection("Patients").where({ id_card: p.id_card }).limit(1).get();
          if (existed.data && existed.data.length) {
            return err("E_CONFLICT", "\u8EAB\u4EFD\u8BC1\u5DF2\u5B58\u5728\uFF0C\u8BF7\u641C\u7D22\u540E\u7F16\u8F91");
          }
        }
        const tail = (() => {
          const s = (p.id_card || "").replace(/\s/g, "");
          return s.length >= 4 ? s.slice(-4) : null;
        })();
        const doc = {
          ...p,
          id_card_tail: tail,
          createdAt: Date.now()
        };
        const addRes = await db.collection("Patients").add({ data: doc });
        return ok({ _id: addRes._id });
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