"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DiscussionGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscussionGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const event_emitter_1 = require("@nestjs/event-emitter");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const discussion_service_1 = require("./discussion.service");
let DiscussionGateway = DiscussionGateway_1 = class DiscussionGateway {
    db;
    svc;
    jwt;
    logger = new common_1.Logger(DiscussionGateway_1.name);
    io;
    constructor(db, svc, jwt) {
        this.db = db;
        this.svc = svc;
        this.jwt = jwt;
    }
    async handleConnection(socket) {
        try {
            const auth = socket.handshake.auth;
            const headers = socket.handshake.headers;
            const query = socket.handshake.query;
            const bearer = typeof headers?.authorization === 'string'
                ? headers.authorization.split(' ')[1]
                : undefined;
            const token = auth?.token || bearer || query?.token;
            if (!token)
                return socket.disconnect(true);
            const payload = await this.jwt.verifyAsync(token);
            const userId = Number(payload?.userId ?? payload?.id ?? payload?.sub);
            if (!userId || Number.isNaN(userId))
                return socket.disconnect(true);
            socket.data.user = { id: userId, role: payload?.role };
        }
        catch (e) {
            socket.disconnect(true);
        }
    }
    async handleDisconnect(_socket) { }
    async onJoin(socket, payload) {
        const userId = socket.data.user?.id;
        if (!userId)
            return { ok: false, error: 'unauthorized' };
        const roomId = Number(payload?.roomId);
        if (!roomId)
            return { ok: false, error: 'invalid roomId' };
        const [room] = await this.db
            .select()
            .from(schema_1.discussionRooms)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionRooms.id, roomId));
        if (!room)
            return { ok: false, error: 'not found' };
        if (room.isPublic) {
            await this.db
                .insert(schema_1.discussionParticipants)
                .values({ roomId, userId, role: 'member' })
                .onConflictDoNothing();
            socket.join(`room:${roomId}`);
            return { ok: true };
        }
        const [p] = await this.db
            .select()
            .from(schema_1.discussionParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.discussionParticipants.roomId, roomId), (0, drizzle_orm_1.eq)(schema_1.discussionParticipants.userId, userId)));
        if (!p)
            return { ok: false, error: 'not a participant' };
        socket.join(`room:${roomId}`);
        return { ok: true };
    }
    async onSend(socket, payload) {
        const userId = socket.data.user?.id;
        if (!userId)
            return { ok: false, error: 'unauthorized' };
        if (!payload?.roomId || !payload?.content)
            return { ok: false, error: 'invalid payload' };
        const msg = await this.svc.sendMessage(payload.roomId, userId, {
            content: payload.content,
        });
        return { ok: true, message: msg };
    }
    async handleMessageCreated(payload) {
        const [m] = await this.db
            .select()
            .from(schema_1.discussionMessages)
            .where((0, drizzle_orm_1.eq)(schema_1.discussionMessages.id, payload.messageId));
        if (m)
            this.io.to(`room:${payload.roomId}`).emit('message.new', m);
    }
};
exports.DiscussionGateway = DiscussionGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DiscussionGateway.prototype, "io", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('room.join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DiscussionGateway.prototype, "onJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message.send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DiscussionGateway.prototype, "onSend", null);
__decorate([
    (0, event_emitter_1.OnEvent)('discussion.message.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DiscussionGateway.prototype, "handleMessageCreated", null);
exports.DiscussionGateway = DiscussionGateway = DiscussionGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/discussion', cors: true }),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        discussion_service_1.DiscussionService,
        jwt_1.JwtService])
], DiscussionGateway);
//# sourceMappingURL=discussion.gateway.js.map