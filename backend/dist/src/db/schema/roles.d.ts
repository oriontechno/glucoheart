export declare const ROLES: {
    readonly USER: "USER";
    readonly NURSE: "NURSE";
    readonly ADMIN: "ADMIN";
    readonly SUPPORT: "SUPPORT";
};
export type Role = (typeof ROLES)[keyof typeof ROLES];
export declare const roleEnum: import("drizzle-orm/pg-core").PgEnum<[string, ...string[]]>;
