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
exports.ArticlesController = void 0;
const common_1 = require("@nestjs/common");
const articles_service_1 = require("./articles.service");
const create_article_dto_1 = require("./dto/create-article.dto");
const update_article_dto_1 = require("./dto/update-article.dto");
const attach_image_dto_1 = require("./dto/attach-image.dto");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function ensureUploadDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
const relJoin = (...p) => path.posix.join(...p);
const uploadDir = path.join(process.cwd(), 'uploads', 'articles');
ensureUploadDir(uploadDir);
const imageFileFilter = (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Invalid image type'), ok);
};
const multerImageOptions = {
    storage: (0, multer_1.diskStorage)({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname);
            const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
            cb(null, name);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFileFilter,
};
let ArticlesController = class ArticlesController {
    svc;
    constructor(svc) {
        this.svc = svc;
    }
    async create(req, dto) {
        const { user } = req;
        return this.svc.create({ id: user.id, role: user.role }, dto);
    }
    async update(req, id, dto) {
        const { user } = req;
        return this.svc.update({ id: user.id, role: user.role }, id, dto);
    }
    async publish(req, id) {
        const { user } = req;
        return this.svc.publish({ id: user.id, role: user.role }, id);
    }
    async unpublish(req, id) {
        const { user } = req;
        return this.svc.unpublish({ id: user.id, role: user.role }, id);
    }
    async listAllForAdmin(req, q) {
        const { user } = req;
        return this.svc.listAllForAdmin({ id: user.id, role: user.role }, {
            q: q.q,
            limit: Number(q.limit),
            offset: Number(q.offset),
            status: q.status,
        });
    }
    async attachImage(req, id, file, dto) {
        const { user } = req;
        if (!file)
            throw new Error('No file uploaded');
        const rel = path.posix.join('uploads', 'articles', path.basename(file.path));
        const publicUrl = '/' + rel.replace(/\\/g, '/');
        await this.svc.attachImage({ id: user.id, role: user.role }, id, { url: publicUrl, storageKey: file.path }, { ...dto, isCover: false, position: dto?.position ?? 0 });
        return { url: publicUrl };
    }
    async editorUpload(req, id, file, dto) {
        if (!file)
            throw new Error('No file uploaded');
        const rel = relJoin('uploads', 'articles', path.basename(file.path));
        const publicUrl = '/' + rel.replace(/\\/g, '/');
        const { user } = req;
        const result = await this.svc.uploadEditorImage({ id: user.id, role: user.role }, id, { url: publicUrl, storageKey: file.path }, { alt: dto?.alt, position: dto?.position });
        return { url: result.url };
    }
    async getPublicList(q) {
        return this.svc.getPublicList({
            q: q.q,
            limit: Number(q.limit),
            offset: Number(q.offset),
        });
    }
    async getPublicBySlug(slug) {
        return this.svc.getPublicBySlug(slug);
    }
    async getByIdForAdmin(req, id) {
        const { user } = req;
        return this.svc.getByIdForAdmin({ id: user.id, role: user.role }, id);
    }
};
exports.ArticlesController = ArticlesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_article_dto_1.CreateArticleDto]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, update_article_dto_1.UpdateArticleDto]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/unpublish'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "unpublish", null);
__decorate([
    (0, common_1.Get)('admin'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "listAllForAdmin", null);
__decorate([
    (0, common_1.Post)(':id/images'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', multerImageOptions)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object, attach_image_dto_1.AttachImageDto]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "attachImage", null);
__decorate([
    (0, common_1.Post)(':id/images/editor'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('upload', multerImageOptions)),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "editorUpload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getPublicList", null);
__decorate([
    (0, common_1.Get)('slug/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getPublicBySlug", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getByIdForAdmin", null);
exports.ArticlesController = ArticlesController = __decorate([
    (0, common_1.Controller)('articles'),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], ArticlesController);
//# sourceMappingURL=articles.controller.js.map