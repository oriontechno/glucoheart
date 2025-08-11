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
exports.DiscussionController = void 0;
const common_1 = require("@nestjs/common");
const discussion_service_1 = require("./discussion.service");
const create_room_dto_1 = require("./dto/create-room.dto");
const send_message_dto_1 = require("./dto/send-message.dto");
let DiscussionController = class DiscussionController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async createRoom(req, dto) {
        const { user } = req;
        return this.svc.createRoom({ id: user.id, role: user.role }, dto);
    }
    async listRooms() {
        return this.svc.listRooms();
    }
    async joinRoom(req, roomId) {
        const { user } = req;
        return this.svc.joinRoom(roomId, user.id);
    }
    async leaveRoom(req, roomId) {
        const { user } = req;
        return this.svc.leaveRoom(roomId, user.id);
    }
    async sendMessage(req, roomId, dto) {
        const { user } = req;
        return this.svc.sendMessage(roomId, user.id, dto);
    }
    async fetchMessages(roomId) {
        return this.svc.fetchMessages(roomId);
    }
};
exports.DiscussionController = DiscussionController;
__decorate([
    (0, common_1.Post)('rooms'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_room_dto_1.CreateRoomDto]),
    __metadata("design:returntype", Promise)
], DiscussionController.prototype, "createRoom", null);
__decorate([
    (0, common_1.Get)('rooms'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DiscussionController.prototype, "listRooms", null);
__decorate([
    (0, common_1.Post)('rooms/:roomId/join'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('roomId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], DiscussionController.prototype, "joinRoom", null);
__decorate([
    (0, common_1.Post)('rooms/:roomId/leave'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('roomId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], DiscussionController.prototype, "leaveRoom", null);
__decorate([
    (0, common_1.Post)('rooms/:roomId/message'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('roomId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, send_message_dto_1.DiscussionSendMessageDto]),
    __metadata("design:returntype", Promise)
], DiscussionController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('rooms/:roomId/messages'),
    __param(0, (0, common_1.Param)('roomId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], DiscussionController.prototype, "fetchMessages", null);
exports.DiscussionController = DiscussionController = __decorate([
    (0, common_1.Controller)('discussion'),
    __metadata("design:paramtypes", [discussion_service_1.DiscussionService])
], DiscussionController);
//# sourceMappingURL=discussion.controller.js.map