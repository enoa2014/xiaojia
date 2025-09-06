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
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));
var import_zod = require("zod");

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});

// index.ts
import_wx_server_sdk.default.init({ env: import_wx_server_sdk.default.DYNAMIC_CURRENT_ENV });
var db = import_wx_server_sdk.default.database();
var SetRoleSchema = import_zod.z.object({
  role: import_zod.z.enum(["admin", "social_worker", "volunteer", "parent"])
});
var main = async (event) => {
  var _a, _b, _c, _d;
  try {
    const { action, payload } = event || {};
    const { OPENID } = ((_b = (_a = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
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
          return ok({ openId: OPENID, role: null, roles: [] });
        return ok({ openId: OPENID, role: doc.role || null, roles: doc.roles || (doc.role ? [doc.role] : []) });
      }
      case "setRole": {
        if (!OPENID)
          return err("E_AUTH", "\u672A\u767B\u5F55");
        const { role } = SetRoleSchema.parse(payload || {});
        let docId = null;
        try {
          const byOpen = await db.collection("Users").where({ openId: OPENID }).limit(1).get();
          if ((_d = byOpen.data) == null ? void 0 : _d.length)
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