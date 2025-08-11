"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const index_1 = require("./index");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            {
                provide: 'DATABASE_CONNECTION',
                inject: [config_1.ConfigService],
                useFactory: async (configService) => {
                    return (0, index_1.createDrizzleConnection)({
                        host: configService.get('DB_HOST') || 'localhost',
                        port: parseInt(configService.get('DB_PORT') || '5432'),
                        user: configService.get('DB_USER') || 'postgres',
                        password: configService.get('DB_PASSWORD') || '123',
                        database: configService.get('DB_NAME') || 'glucoheart',
                        ssl: false,
                    });
                },
            },
        ],
        exports: ['DATABASE_CONNECTION'],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map