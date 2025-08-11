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
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { AttachImageDto } from './dto/attach-image.dto';
import { Request } from 'express';
import { RequestUser } from './types';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import * as path from 'path';

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

@Controller('articles')
export class ArticlesController {
  constructor(private readonly svc: ArticlesService) {}

  // ===== Admin/Support =====
  @Post()
  async create(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateArticleDto,
  ) {
    const { user } = req;
    return this.svc.create({ id: user.id, role: user.role }, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
  ) {
    const { user } = req;
    return this.svc.update({ id: user.id, role: user.role }, id, dto);
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

  @Post(':id/images/editor')
  @UseInterceptors(FileInterceptor('upload', multerImageOptions)) // ⬅️ gunakan options bersama
  async editorUpload(
    @Req() req: Request & { user: { id: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { alt?: string; position?: number },
  ) {
    if (!file) throw new Error('No file uploaded');

    // Bangun URL publik cross-platform
    const rel = relJoin('uploads', 'articles', path.basename(file.path));
    const publicUrl = '/' + rel.replace(/\\/g, '/');

    const { user } = req;
    const result = await this.svc.uploadEditorImage(
      { id: user.id, role: user.role },
      id,
      { url: publicUrl, storageKey: file.path },
      { alt: dto?.alt, position: dto?.position },
    );

    // CKEditor expects { url } (bisa juga { uploaded: true, url })
    return { url: result.url };
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
}
