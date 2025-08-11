"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const roles_1 = require("../db/schema/roles");
let AuthService = class AuthService {
    db;
    jwtService;
    constructor(db, jwtService) {
        this.db = db;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const { email, password, firstName, lastName } = registerDto;
        const existingUser = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await this.db
            .insert(schema_1.users)
            .values({
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: roles_1.ROLES.USER,
        })
            .returning();
        return {
            message: 'User registered successfully',
            user: {
                id: newUser[0].id,
                email: newUser[0].email,
                role: newUser[0].role,
            },
        };
    }
    async validateUser(email, password) {
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
        });
        if (!user || !user.password) {
            return null;
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }
        const { password: _, ...result } = user;
        return result;
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.validateUser(email, password);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return this.generateToken(user);
    }
    async generateToken(user) {
        const payload = {
            email: user.email,
            sub: user.id,
            role: user.role,
        };
        const token = this.jwtService.sign(payload);
        return {
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                profilePicture: user.profilePicture,
            },
        };
    }
    async getProfile(userId) {
        const user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.id, userId),
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const { password, ...result } = user;
        return result;
    }
    async validateGoogleUser(profile) {
        const { email, given_name, family_name, picture, sub } = profile._json;
        let user = await this.db.query.users.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.users.email, email),
        });
        if (!user) {
            const newUser = await this.db
                .insert(schema_1.users)
                .values({
                email,
                googleId: sub,
                firstName: given_name,
                lastName: family_name,
                profilePicture: picture,
                role: roles_1.ROLES.USER,
            })
                .returning();
            user = newUser[0];
        }
        else if (!user.googleId) {
            await this.db
                .update(schema_1.users)
                .set({
                googleId: sub,
                profilePicture: user.profilePicture || picture,
            })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, user.id));
        }
        return this.generateToken(user);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('DATABASE_CONNECTION')),
    __metadata("design:paramtypes", [node_postgres_1.NodePgDatabase,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map