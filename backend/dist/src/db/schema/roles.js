"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleEnum = exports.ROLES = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.ROLES = {
    USER: 'USER',
    NURSE: 'NURSE',
    ADMIN: 'ADMIN',
    SUPPORT: 'SUPPORT',
};
exports.roleEnum = (0, pg_core_1.pgEnum)('role', Object.values(exports.ROLES));
//# sourceMappingURL=roles.js.map