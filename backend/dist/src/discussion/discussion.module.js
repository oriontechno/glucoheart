"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscussionModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const event_emitter_1 = require("@nestjs/event-emitter");
const discussion_controller_1 = require("./discussion.controller");
const discussion_service_1 = require("./discussion.service");
const discussion_gateway_1 = require("./discussion.gateway");
const database_module_1 = require("../db/database.module");
let DiscussionModule = class DiscussionModule {
};
exports.DiscussionModule = DiscussionModule;
exports.DiscussionModule = DiscussionModule = __decorate([
    (0, common_1.Module)({
        imports: [
            event_emitter_1.EventEmitterModule.forRoot(),
            jwt_1.JwtModule.register({
                secret: process.env.JWT_SECRET ?? 'dev-secret',
                signOptions: { expiresIn: '7d' },
            }),
            database_module_1.DatabaseModule,
        ],
        controllers: [discussion_controller_1.DiscussionController],
        providers: [discussion_service_1.DiscussionService, discussion_gateway_1.DiscussionGateway],
    })
], DiscussionModule);
//# sourceMappingURL=discussion.module.js.map