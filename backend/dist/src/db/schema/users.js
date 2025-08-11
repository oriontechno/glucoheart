"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRelations = exports.setUserArticlesRef = exports.setUserGroupMembersRef = exports.setUserMessagesRef = exports.users = void 0;
exports.initializeUsersRelations = initializeUsersRelations;
const drizzle_orm_1 = require("drizzle-orm");
const pg_core_1 = require("drizzle-orm/pg-core");
const roles_1 = require("./roles");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    password: (0, pg_core_1.varchar)('password', { length: 255 }),
    googleId: (0, pg_core_1.varchar)('google_id', { length: 255 }),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    role: (0, roles_1.roleEnum)('role').notNull().default('USER'),
    profilePicture: (0, pg_core_1.varchar)('profile_picture', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').default((0, drizzle_orm_1.sql) `CURRENT_TIMESTAMP`),
});
let messagesRef;
let groupMembersRef;
let articlesRef;
const setUserMessagesRef = (ref) => {
    messagesRef = ref;
};
exports.setUserMessagesRef = setUserMessagesRef;
const setUserGroupMembersRef = (ref) => {
    groupMembersRef = ref;
};
exports.setUserGroupMembersRef = setUserGroupMembersRef;
const setUserArticlesRef = (ref) => {
    articlesRef = ref;
};
exports.setUserArticlesRef = setUserArticlesRef;
exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, () => ({}));
function initializeUsersRelations() {
    if (messagesRef && groupMembersRef && articlesRef) {
        exports.usersRelations = (0, drizzle_orm_1.relations)(exports.users, ({ many }) => ({
            sentMessages: many(messagesRef),
            receivedMessages: many(messagesRef, { relationName: 'receivedMessages' }),
            groupMemberships: many(groupMembersRef),
            articles: many(articlesRef),
        }));
    }
    return exports.usersRelations;
}
//# sourceMappingURL=users.js.map