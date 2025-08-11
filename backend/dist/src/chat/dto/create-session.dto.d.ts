export declare class CreateSessionDto {
    targetUserId: number;
}
export declare enum ChatTargetRole {
    ADMIN = "ADMIN",
    SUPPORT = "SUPPORT"
}
export declare class CreateSessionByRoleDto {
    role: ChatTargetRole;
}
