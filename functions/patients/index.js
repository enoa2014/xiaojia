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
var import_wx_server_sdk2 = __toESM(require("wx-server-sdk"));
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
var PatientUpdateSchema2 = import_zod.z.object({
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
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
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
        const base = db.collection("Patients").where(query);
        const { items, meta } = await paginate(base, { page: qp.page, pageSize: qp.pageSize, sort: qp.sort }, { fallbackSort: { createdAt: -1 }, countQuery: db.collection("Patients").where(query) });
        const isPrivileged = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
        const listItems = items || [];
        const ids = listItems.map((i) => String(i._id)).filter(Boolean);
        const statsMap = {};
        const toDateKey = (v) => {
          if (!v)
            return 0;
          try {
            if (typeof v === "number")
              return v;
            if (typeof v === "string") {
              const d2 = new Date(v);
              return isNaN(d2.getTime()) ? 0 : d2.getTime();
            }
            const d = new Date(v);
            return isNaN(d.getTime()) ? 0 : d.getTime();
          } catch {
            return 0;
          }
        };
        const toDateStr = (v) => {
          const t = typeof v === "number" ? v : toDateKey(v);
          if (!t)
            return null;
          const d = new Date(t);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        };
        if (ids.length) {
          try {
            const tSnap = await db.collection("Tenancies").where({ patientId: _.in(ids) }).field({ patientId: true, checkInDate: true }).limit(1e3).get();
            for (const t of tSnap && tSnap.data || []) {
              const pid = String(t.patientId || "");
              const inDateKey = toDateKey(t.checkInDate);
              if (!pid || !inDateKey)
                continue;
              const cur = statsMap[pid] || { count: 0, last: null };
              cur.count += 1;
              const curKey = cur.last ? toDateKey(cur.last) : 0;
              if (!cur.last || inDateKey > curKey)
                cur.last = toDateStr(inDateKey);
              statsMap[pid] = cur;
            }
          } catch (e) {
          }
        }
        const missingPids = listItems.map((p) => String(p._id)).filter((pid) => !statsMap[pid]);
        if (missingPids.length) {
          const idCardToPid = {};
          const idCards = [];
          for (const p of listItems) {
            const pid = String(p._id);
            if (!statsMap[pid] && p.id_card) {
              const idc = String(p.id_card).trim();
              if (idc) {
                idCards.push(idc);
                idCardToPid[idc] = pid;
              }
            }
          }
          if (idCards.length) {
            try {
              const tSnap2 = await db.collection("Tenancies").where({ id_card: _.in(idCards) }).field({ id_card: true, checkInDate: true }).limit(1e3).get();
              for (const t of tSnap2 && tSnap2.data || []) {
                const idc = t.id_card ? String(t.id_card) : "";
                const pid = idCardToPid[idc];
                const inDateKey = toDateKey(t.checkInDate);
                if (!pid || !inDateKey)
                  continue;
                const cur = statsMap[pid] || { count: 0, last: null };
                cur.count += 1;
                const curKey = cur.last ? toDateKey(cur.last) : 0;
                if (!cur.last || inDateKey > curKey)
                  cur.last = toDateStr(inDateKey);
                statsMap[pid] = cur;
              }
            } catch (e) {
            }
          }
        }
        {
          const missingByName = listItems.filter((p) => {
            const pid = String(p._id);
            return !statsMap[pid] && !p.id_card && p.name;
          });
          if (missingByName.length) {
            try {
              const names = missingByName.map((p) => String(p.name)).filter(Boolean);
              if (names.length) {
                const nameToPids = {};
                for (const p of missingByName) {
                  const n = String(p.name);
                  const pid = String(p._id);
                  nameToPids[n] = (nameToPids[n] || []).concat(pid);
                }
                const tSnap3 = await db.collection("Tenancies").where({ patientName: _.in(names) }).field({ patientName: true, checkInDate: true }).limit(1e3).get();
                for (const t of tSnap3 && tSnap3.data || []) {
                  const n = t.patientName ? String(t.patientName) : "";
                  const inDateKey = toDateKey(t.checkInDate);
                  const pids = nameToPids[n] || [];
                  if (!n || !inDateKey || !pids.length)
                    continue;
                  for (const pid of pids) {
                    const cur = statsMap[pid] || { count: 0, last: null };
                    cur.count += 1;
                    const curKey = cur.last ? toDateKey(cur.last) : 0;
                    if (!cur.last || inDateKey > curKey)
                      cur.last = toDateStr(inDateKey);
                    statsMap[pid] = cur;
                  }
                }
              }
            } catch (e) {
            }
          }
        }
        const outItems = listItems.map((p) => {
          const st = statsMap[String(p._id)] || null;
          const diag = p.hospitalDiagnosis || p.diagnosis || null;
          const level = p.diagnosisLevel || p.diagnosis_enum || null;
          const maskedDiag = diag ? level ? `\u8BCA\u65AD\u7EA7\u522B\uFF1A${level}` : "\u8BCA\u65AD\u4FE1\u606F\u5DF2\u8131\u654F" : null;
          return {
            ...p,
            hospitalDiagnosis: isPrivileged ? diag ?? null : maskedDiag ?? p.hospitalDiagnosis ?? null,
            lastCheckInDate: st ? st.last : null,
            admissionCount: st ? st.count : 0
          };
        });
        return ok({ items: outItems, meta });
      }
      case "get": {
        const parsed = import_zod2.z.object({ id: import_zod2.z.string(), requestId: import_zod2.z.string().optional() }).safeParse(payload || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const { id, requestId } = parsed.data;
        const r = await db.collection("Patients").doc(id).get();
        if (!(r == null ? void 0 : r.data))
          return err("E_NOT_FOUND", "patient not found");
        const patient = r.data;
        const { OPENID: OPENID2 } = ((_d = (_c = import_wx_server_sdk2.default).getWXContext) == null ? void 0 : _d.call(_c)) || {};
        const now = Date.now();
        const isPrivileged = await hasAnyRole(db, OPENID2, ["admin", "social_worker"]);
        let approvedFields = /* @__PURE__ */ new Set();
        let minExpires = null;
        if (isPrivileged) {
          approvedFields = /* @__PURE__ */ new Set(["id_card", "phone", "diagnosis"]);
        } else if (OPENID2) {
          try {
            const _2 = db.command;
            const apr = await db.collection("PermissionRequests").where({ requesterId: OPENID2, patientId: id, status: "approved", expiresAt: _2.gt(now) }).get();
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
          status: isPrivileged ? "approved" : approvedFields.size ? "approved" : "none",
          fields: Array.from(approvedFields),
          expiresAt: minExpires,
          hasSensitive: approvedFields.size > 0,
          hasNamePermission: isPrivileged,
          hasContactPermission: isPrivileged,
          hasAddressPermission: isPrivileged,
          hasIdPermission: approvedFields.has("id_card") || isPrivileged
        };
        if (OPENID2 && returnedFields.length) {
          try {
            await db.collection("AuditLogs").add({ data: {
              actorId: OPENID2,
              action: "patients.readSensitive",
              target: { patientId: id, fields: returnedFields },
              requestId: requestId || null,
              createdAt: now
            } });
          } catch {
          }
        }
        return ok(out);
      }
      case "create": {
        const canCreate = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
        if (!canCreate)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
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
      case "update": {
        const canEdit = await hasAnyRole(db, OPENID, ["admin", "social_worker"]);
        if (!canEdit)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
        const parsed = PatientUpdateSchema.safeParse(payload || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const { id, patch } = parsed.data;
        const curRes = await db.collection("Patients").doc(String(id)).get();
        const cur = curRes && curRes.data;
        if (!cur)
          return err("E_NOT_FOUND", "patient not found");
        if (patch.id_card) {
          if (!isValidChineseId(patch.id_card))
            return errValidate("\u8EAB\u4EFD\u8BC1\u683C\u5F0F\u6216\u6821\u9A8C\u4F4D\u9519\u8BEF");
          const existed = await db.collection("Patients").where({ id_card: patch.id_card }).limit(1).get();
          const existedDoc = (_e = existed == null ? void 0 : existed.data) == null ? void 0 : _e[0];
          if (existedDoc && String(existedDoc._id) != String(id))
            return err("E_CONFLICT", "\u8EAB\u4EFD\u8BC1\u5DF2\u5B58\u5728\uFF0C\u8BF7\u68C0\u67E5");
        }
        if (patch.birthDate && !notAfterToday(patch.birthDate))
          return errValidate("\u51FA\u751F\u65E5\u671F\u9700\u65E9\u4E8E\u6216\u7B49\u4E8E\u4ECA\u65E5");
        const tail = (() => {
          const s = (patch.id_card || cur.id_card || "").replace(/\s/g, "");
          return s.length >= 4 ? s.slice(-4) : cur.id_card_tail || null;
        })();
        const toSet = { ...patch };
        toSet.id_card_tail = tail;
        const upd = await db.collection("Patients").doc(String(id)).update({ data: toSet });
        const updated = upd && (upd.updated || upd.stats && upd.stats.updated) || 0;
        return updated ? ok({ updated }) : err("E_CONFLICT", "\u672A\u53D1\u751F\u53D8\u66F4");
      }
      case "admin.deleteByName": {
        const canAdmin = await hasAnyRole(db, OPENID, ["admin"]);
        if (!canAdmin)
          return err("E_PERM", "\u9700\u8981\u6743\u9650");
        const parsed = import_zod2.z.object({ name: import_zod2.z.string().min(1), dryRun: import_zod2.z.boolean().optional() }).safeParse(payload || {});
        if (!parsed.success) {
          const m = mapZodIssues(parsed.error.issues);
          return errValidate(m.msg, parsed.error.issues);
        }
        const { name, dryRun } = parsed.data;
        const ps = await db.collection("Patients").where({ name }).get();
        const patients = ps && ps.data || [];
        let delPatients = 0, delTenancies = 0, delServices = 0;
        for (const p of patients) {
          const pid = String(p._id);
          if (!dryRun) {
            try {
              const r1 = await db.collection("Tenancies").where({ patientId: pid }).remove();
              delTenancies += (r1 == null ? void 0 : r1.deleted) || ((_f = r1 == null ? void 0 : r1.stats) == null ? void 0 : _f.removed) || 0;
            } catch {
            }
            try {
              if (p.id_card) {
                const r1b = await db.collection("Tenancies").where({ id_card: String(p.id_card) }).remove();
                delTenancies += (r1b == null ? void 0 : r1b.deleted) || ((_g = r1b == null ? void 0 : r1b.stats) == null ? void 0 : _g.removed) || 0;
              }
            } catch {
            }
            try {
              const r2 = await db.collection("Services").where({ patientId: pid }).remove();
              delServices += (r2 == null ? void 0 : r2.deleted) || ((_h = r2 == null ? void 0 : r2.stats) == null ? void 0 : _h.removed) || 0;
            } catch {
            }
            try {
              const r0 = await db.collection("Patients").doc(pid).remove();
              delPatients += (r0 == null ? void 0 : r0.deleted) || ((_i = r0 == null ? void 0 : r0.stats) == null ? void 0 : _i.removed) || 0;
            } catch {
            }
          }
        }
        return ok({ matched: patients.length, delPatients, delTenancies, delServices, dryRun: !!dryRun });
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