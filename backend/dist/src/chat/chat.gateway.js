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
var ChatGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const event_emitter_1 = require("@nestjs/event-emitter");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const chat_service_1 = require("./chat.service");
let ChatGateway = ChatGateway_1 = class ChatGateway {
    db;
    chat;
    jwt;
    logger = new common_1.Logger(ChatGateway_1.name);
    io;
    constructor(db, chat, jwt) {
        this.db = db;
        this.chat = chat;
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
            if (!token) {
                this.logger.warn(`Disconnecting unauthenticated socket: ${socket.id}`);
                socket.emit('error', 'Unauthorized');
                socket.disconnect(true);
                return;
            }
            const payload = await this.jwt.verifyAsync(token);
            const userId = Number(payload?.userId ?? payload?.id ?? payload?.sub);
            if (!userId || Number.isNaN(userId)) {
                this.logger.warn(`Invalid JWT payload on socket ${socket.id}`);
                socket.emit('error', 'Unauthorized');
                socket.disconnect(true);
                return;
            }
            socket.data.user = { id: userId, role: payload?.role };
            this.logger.debug(`Socket connected: ${socket.id} (user ${userId})`);
        }
        catch (e) {
            this.logger.error(`handleConnection error: ${e}`);
            socket.emit('error', 'Unauthorized');
            socket.disconnect(true);
        }
    }
    async handleDisconnect(socket) {
        this.logger.debug(`Socket disconnected: ${socket.id}`);
    }
    async onJoin(socket, payload) {
        const userId = socket.data.user?.id;
        if (!userId)
            return { ok: false, error: 'unauthorized' };
        if (!payload?.sessionId || Number.isNaN(Number(payload.sessionId)))
            return { ok: false, error: 'invalid sessionId' };
        const [p] = await this.db
            .select()
            .from(schema_1.chatSessionParticipants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.sessionId, payload.sessionId), (0, drizzle_orm_1.eq)(schema_1.chatSessionParticipants.userId, userId)));
        if (!p)
            return { ok: false, error: 'not a participant' };
        socket.join(`session:${payload.sessionId}`);
        return { ok: true };
    }
    async onLeave(socket, payload) {
        if (!payload?.sessionId)
            return { ok: false, error: 'invalid sessionId' };
        socket.leave(`session:${payload.sessionId}`);
        return { ok: true };
    }
    async onSend(socket, payload) {
        const userId = socket.data.user?.id;
        if (!userId)
            return { ok: false, error: 'unauthorized' };
        if (!payload?.sessionId || !payload?.content)
            return { ok: false, error: 'invalid payload' };
        const msg = await this.chat.sendMessage(payload.sessionId, userId, {
            content: payload.content,
        });
        return { ok: true, message: msg };
    }
    async handleMessageCreated(payload) {
        try {
            const [m] = await this.db
                .select()
                .from(schema_1.messages)
                .where((0, drizzle_orm_1.eq)(schema_1.messages.id, payload.messageId));
            if (!m)
                return;
            this.io.to(`session:${payload.sessionId}`).emit('message.new', m);
        }
        catch (e) {
            this.logger.error(`handleMessageCreated error: ${e}`);
        }
    }
    async handleNurseAssigned(payload) {
        try {
            this.io
                .to(`session:${payload.sessionId}`)
                .emit('session.nurseAssigned', payload);
        }
        catch (e) {
            this.logger.error(`handleNurseAssigned error: ${e}`);
        }
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "io", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('session.join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onJoin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('session.leave'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onLeave", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('message.send'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "onSend", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.message.created'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleMessageCreated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('chat.nurse.assigned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleNurseAssigned", null);
exports.ChatGateway = ChatGateway = ChatGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({ namespace: '/chat', cors: true }),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        chat_service_1.ChatService,
        jwt_1.JwtService])
], ChatGateway);
//# sourceMappingURL=chat.gateway.js.map