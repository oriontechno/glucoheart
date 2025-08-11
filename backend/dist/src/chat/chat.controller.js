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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const send_messages_dto_1 = require("./dto/send-messages.dto");
const assign_nurse_dto_1 = require("./dto/assign-nurse.dto");
let ChatController = class ChatController {
    chat;
    constructor(chat) {
        this.chat = chat;
    }
    async createOrGetSessionByRole(req, dto) {
        const { user } = req;
        const role = dto.role ?? create_session_dto_1.ChatTargetRole.ADMIN;
        return this.chat.getOrCreateOneToOneSessionByRole(user.id, role);
    }
    async sendMessage(req, sessionId, dto) {
        const { user } = req;
        return this.chat.sendMessage(sessionId, user.id, dto);
    }
    async fetchMessages(req, sessionId) {
        const { user } = req;
        return this.chat.fetchMessages(sessionId, user.id);
    }
    async listSessions(req) {
        const { user } = req;
        return this.chat.listSessions(user.id);
    }
    async assignNurse(req, sessionId, dto) {
        const { user } = req;
        return this.chat.assignNurse(sessionId, { id: user.id, role: user.role }, dto);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('session'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_session_dto_1.CreateSessionByRoleDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createOrGetSessionByRole", null);
__decorate([
    (0, common_1.Post)('session/:sessionId/message'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, send_messages_dto_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('session/:sessionId/messages'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "fetchMessages", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "listSessions", null);
__decorate([
    (0, common_1.Post)('session/:sessionId/assign-nurse'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, assign_nurse_dto_1.AssignNurseDto]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "assignNurse", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map