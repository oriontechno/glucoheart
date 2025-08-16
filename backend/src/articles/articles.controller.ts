import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Request } from 'express';
import { RequestUser } from './types';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { ZodValidation } from '../zod/zod-validation.decorator';
import {
  createArticleSchema,
  updateArticleSchema,
  attachImageSchema,
  // type CreateArticleDto,
  // type UpdateArticleDto,
  type AttachImageDto,
} from './schema/articles.schema';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SetArticleCategoriesDto } from './dto/set-article-categories.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

function ensureUploadDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const relJoin = (...p: string[]) => path.posix.join(...p);

const uploadDir = path.join(process.cwd(), 'uploads', 'articles');
ensureUploadDir(uploadDir);

const imageFileFilter: any = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: any, acceptFile: boolean) => void,
) => {
  const ok = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype);
  cb(ok ? null : new Error('Invalid image type'), ok);
};

const multerImageOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: imageFileFilter,
} as const;
@UseGuards(JwtAuthGuard)
@Controller('articles')
export class ArticlesController {
  constructor(private readonly svc: ArticlesService) {}

  // Update existing list/search to accept ?categories=slug1.slug2
  @Get('all')
  async getAllSimple(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('categories') categories?: string,
  ) {
    return this.svc.findAllSimple({
      status,
      search,
      limit: Number(limit),
      categories,
    });
  }

  @Get('search')
  async getSearch(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('scope') scope?: 'public' | 'admin',
    @Query('categories') categories?: string,
  ) {
    const realScope: 'public' | 'admin' =
      scope === 'admin' ? 'admin' : 'public';
    return this.svc.findPaginated({
      page: Number(page),
      limit: Number(limit),
      status,
      search,
      sort,
      scope: realScope,
      categories,
    });
  }

  @Get('categories')
  async listCategories(
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.listCategories(
      q,
      Number(limit ?? 100),
      Number(offset ?? 0),
    );
  }

  @Post(':id/categories')
  async setArticleCategories(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetArticleCategoriesDto,
  ) {
    return this.svc.setArticleCategories(
      { id: req.user.id, role: req.user.role },
      id,
      body.categories || [],
    );
  }

  // ===== Admin/Support =====
  @Post()
  // @ZodValidation(createArticleSchema)
  @UseInterceptors(FileInterceptor('cover', multerImageOptions))
  async createWithCover(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Body() body: any,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    const user = { id: Number(req.user.id), role: req.user.role };
    console.log('BODY FIELDS:', body); // 👈 cek di console
    console.log(
      'FILE:',
      cover?.fieldname,
      cover?.originalname,
      cover?.mimetype,
      cover?.size,
    );
    return this.svc.createWithOptionalCover(
      user,
      {
        title: body?.title,
        summary: body?.summary,
        content: body?.content,
        status: body?.status, // 'draft' | 'published'
        categories: body?.categories, // "slug1.slug2"
        coverAlt: body?.coverAlt,
        // opsi B (tanpa file) bisa pakai coverUrl, lihat Opsi B di bawah
      },
      cover,
    );
  }

  @Patch(':id')
  // @ZodValidation(updateArticleSchema)
  @UseInterceptors(FileInterceptor('cover', multerImageOptions))
  async updateWithCover(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateArticleDto, // field text lain tetap bisa dikirim (title, status, categories, coverAlt, removeCover)
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    const user = { id: Number(req.user.id), role: req.user.role };
    return this.svc.updateWithOptionalCover(user, id, body, cover);
  }

  @Delete(':id')
  async remove(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const user = { id: Number(req.user.id), role: req.user.role };
    return this.svc.deleteArticle(user, id);
  }

  @Post(':id/publish')
  async publish(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { user } = req;
    return this.svc.publish({ id: user.id, role: user.role }, id);
  }

  @Post(':id/unpublish')
  async unpublish(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { user } = req;
    return this.svc.unpublish({ id: user.id, role: user.role }, id);
  }

  @Get('admin')
  async listAllForAdmin(
    @Req() req: Request & { user: RequestUser },
    @Query() q: any,
  ) {
    const { user } = req;
    return this.svc.listAllForAdmin(
      { id: user.id, role: user.role },
      {
        q: q.q,
        limit: Number(q.limit),
        offset: Number(q.offset),
        status: q.status,
      },
    );
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', multerImageOptions))
  @ZodValidation(attachImageSchema)
  async attachImage(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AttachImageDto,
  ) {
    const { user } = req;
    if (!file) throw new Error('No file uploaded');
    const rel = path.posix.join(
      'uploads',
      'articles',
      path.basename(file.path),
    );
    const publicUrl = '/' + rel.replace(/\\/g, '/');
    await this.svc.attachImage(
      { id: user.id, role: user.role },
      id,
      { url: publicUrl, storageKey: file.path },
      { ...dto, isCover: false, position: dto?.position ?? 0 },
    );
    return { url: publicUrl };
  }

  @Post('editor/upload')
  @UseInterceptors(FileInterceptor('file', multerImageOptions))
  async editorUpload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('file is required');
    return this.svc.editorUpload(file);
  }

  // ===== Public =====
  @Get()
  async getPublicList(@Query() q: any) {
    return this.svc.getPublicList({
      q: q.q,
      limit: Number(q.limit),
      offset: Number(q.offset),
    });
  }

  @Get('slug/:slug')
  async getPublicBySlug(@Param('slug') slug: string) {
    return this.svc.getPublicBySlug(slug);
  }

  @Get(':id')
  async getByIdForAdmin(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { user } = req;
    return this.svc.getByIdForAdmin({ id: user.id, role: user.role }, id);
  }

  // Categories
  @Post('categories')
  async createCategory(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.svc.createCategory(
      { id: req.user.id, role: req.user.role },
      dto,
    );
  }

  @Patch('categories/:id')
  async updateCategory(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.svc.updateCategory(
      { id: req.user.id, role: req.user.role },
      id,
      dto,
    );
  }

  @Delete('categories/:id')
  async deleteCategory(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.svc.deleteCategory(
      { id: req.user.id, role: req.user.role },
      id,
    );
  }
}
