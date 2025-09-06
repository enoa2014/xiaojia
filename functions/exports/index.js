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
var import_wx_server_sdk = __toESM(require("wx-server-sdk"));

// ../packages/core-utils/errors.ts
var ok = (data) => ({ ok: true, data });
var err = (code, msg, details) => ({
  ok: false,
  error: { code, msg, details }
});

// ../packages/core-rbac/index.ts
var isRole = async (db, openId, role) => {
  var _a, _b, _c;
  if (!openId)
    return false;
  try {
    const _ = db.command;
    const byOpenId = await db.collection("Users").where({ openId, role }).limit(1).get();
    if ((_a = byOpenId == null ? void 0 : byOpenId.data) == null ? void 0 : _a.length)
      return true;
    const byId = await db.collection("Users").where({ _id: openId, role }).limit(1).get();
    if ((_b = byId == null ? void 0 : byId.data) == null ? void 0 : _b.length)
      return true;
    const byRoles = await db.collection("Users").where({ openId, roles: _.in([role]) }).limit(1).get();
    if ((_c = byRoles == null ? void 0 : byRoles.data) == null ? void 0 : _c.length)
      return true;
  } catch {
  }
  return false;
};
var hasAnyRole = async (db, openId, roles) => {
  for (const r of roles) {
    if (await isRole(db, openId, r))
      return true;
  }
  return false;
};

// index.ts
import_wx_server_sdk.default.init({ env: import_wx_server_sdk.default.DYNAMIC_CURRENT_ENV });
var main = async (event) => {
  var _a, _b;
  const { OPENID } = ((_b = (_a = import_wx_server_sdk.default).getWXContext) == null ? void 0 : _b.call(_a)) || {};
  const allowed = await hasAnyRole(import_wx_server_sdk.default.database(), OPENID, ["admin", "social_worker"]);
  if (!allowed)
    return err("E_PERM", "\u9700\u8981\u6743\u9650");
  return ok({ ping: "exports", event });
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  main
});
//# sourceMappingURL=index.js.map