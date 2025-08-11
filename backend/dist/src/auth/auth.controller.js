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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const passport_1 = require("@nestjs/passport");
const local_auth_guard_1 = require("./guards/local-auth.guard");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const config_1 = require("@nestjs/config");
const public_decorator_1 = require("../common/decorators/public.decorator");
const token_blacklist_service_1 = require("./token-blacklist.service");
const jwt_1 = require("@nestjs/jwt");
let AuthController = AuthController_1 = class AuthController {
    authService;
    configService;
    tokenBlacklistService;
    jwtService;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService, configService, tokenBlacklistService, jwtService) {
        this.authService = authService;
        this.configService = configService;
        this.tokenBlacklistService = tokenBlacklistService;
        this.jwtService = jwtService;
    }
    register(registerDto) {
        return this.authService.register(registerDto);
    }
    login(loginDto, user) {
        this.logger.log(`User logged in: ${user.email}`);
        return this.authService.generateToken(user);
    }
    async getProfile(user, req) {
        this.logger.log('Get profile request headers:', JSON.stringify(req.headers));
        this.logger.log('Current user from token:', user);
        return this.authService.getProfile(user.id);
    }
    googleAuth() {
    }
    async googleAuthCallback(req, res) {
        const { access_token, user } = await this.authService.validateGoogleUser(req.user);
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
        res.redirect(`${frontendUrl}/auth-callback?token=${access_token}&user=${JSON.stringify(user)}`);
    }
    refreshToken(user) {
        return this.authService.generateToken(user);
    }
    checkApiStatus(req) {
        this.logger.log('Check API headers:', JSON.stringify(req.headers));
        return {
            status: 'API is working',
            time: new Date().toISOString(),
        };
    }
    async logout(req) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
                const token = authHeader.split(' ')[1];
                const decoded = this.jwtService.decode(token);
                if (decoded && typeof decoded === 'object' && decoded.exp) {
                    const expiryDate = new Date(decoded.exp * 1000);
                    this.tokenBlacklistService.blacklistToken(token, expiryDate);
                    this.logger.log(`User logged out successfully. Token blacklisted until: ${expiryDate}`);
                    return { message: 'Logout successful' };
                }
            }
            return { message: 'Logout successful' };
        }
        catch (error) {
            this.logger.error('Logout error:', error);
            return { message: 'Logout successful' };
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.UseGuards)(local_auth_guard_1.LocalAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuthCallback", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "refreshToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "checkApiStatus", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService,
        token_blacklist_service_1.TokenBlacklistService,
        jwt_1.JwtService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map