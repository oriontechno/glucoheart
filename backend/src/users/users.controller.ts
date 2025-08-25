import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Query,
  UseGuards,
  Request,
  Req,
  BadRequestException,
  ForbiddenException,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ZodValidation } from '../zod/zod-validation.decorator';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  adminResetPasswordSchema,
  type CreateUserDto,
  type UpdateUserDto,
  type ChangePasswordDto,
  type AdminResetPasswordDto,
} from './schema/users.schema';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';

type RequestUser = {
  id: number;
  role?: 'ADMIN' | 'SUPPORT' | 'NURSE' | 'USER';
};

// ==== Multer options khusus avatar (inline di controller) ====
const multerAvatarOptions = {
  storage: diskStorage({
    destination: async (_req, _file, cb) => {
      try {
        const dest = join(process.cwd(), 'uploads', 'avatar');
        await fs.mkdir(dest, { recursive: true });
        cb(null, dest);
      } catch (err) {
        cb(err as any, '');
      }
    },
    filename: (_req, file, cb) => {
      const name =
        Date.now() +
        '-' +
        randomBytes(6).toString('hex') +
        extname(file.originalname);
      cb(null, name);
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ok =
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'image/webp' ||
      file.mimetype === 'image/jpg' ||
      file.mimetype === 'image/gif';
    if (!ok)
      return cb(new BadRequestException('Only image files are allowed'), false);
    cb(null, true);
  },
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
};

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('count')
  async countUsers(
    @Query('period') period?: string, // day|week|month|year|all
    @Query('from') from?: string, // ISO date (opsional)
    @Query('to') to?: string, // ISO date (opsional)
    @Query('roles') roles?: string, // "user.admin" (opsional)
  ) {
    return this.usersService.countUsers({ period, from, to, roles });
  }

  // ====== User ganti avatar miliknya ======
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('avatar', multerAvatarOptions))
  async uploadMyAvatar(
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.usersService.updateMyAvatar({ id: req.user.id }, file!);
  }

  // Hapus avatar milik sendiri
  @Delete('me/avatar')
  async deleteMyAvatar(@Req() req: Request & { user: RequestUser }) {
    return this.usersService.removeMyAvatar({ id: req.user.id });
  }

  // ====== Admin/Support set avatar user lain ======
  @Post(':id/avatar')
  @UseInterceptors(FileInterceptor('avatar', multerAvatarOptions))
  async adminSetUserAvatar(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) userId: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPPORT') {
      throw new ForbiddenException('Admin/Support only');
    }
    if (!file) throw new BadRequestException('No file uploaded');
    return this.usersService.adminSetAvatar(
      { id: req.user.id, role: req.user.role },
      userId,
      file!,
    );
  }

  // Admin/Support hapus avatar user lain
  @Delete(':id/avatar')
  async adminRemoveUserAvatar(
    @Req() req: Request & { user: RequestUser },
    @Param('id', ParseIntPipe) userId: number,
  ) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPPORT') {
      throw new ForbiddenException('Admin/Support only');
    }
    return this.usersService.adminRemoveAvatar(
      { id: req.user.id, role: req.user.role },
      userId,
    );
  }

  @Post()
  @Roles('ADMIN', 'SUPPORT')
  @ZodValidation(createUserSchema)
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user.role);
  }

  @Get('all')
  async getAll(
    @Query('roles') roles?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAllSimple({ roles, search });
  }

  @Get()
  async getPaginated(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('roles') roles?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ) {
    return this.usersService.findPaginated({
      page: Number(page),
      limit: Number(limit),
      roles,
      search,
      sort,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  // @ZodValidation(updateUserSchema)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(
      +id,
      updateUserDto,
      req.user.role,
      req.user.id,
    );
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPPORT')
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(+id, req.user.role);
  }

  @Post('change-password')
  // @ZodValidation(changePasswordSchema)
  async changePassword(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: ChangePasswordDto,
  ) {
    const { user } = req; // pastikan AuthGuard mengisi req.user
    return this.usersService.changePassword({ id: user.id }, dto);
  }

  @Post('reset-password')
  @ZodValidation(adminResetPasswordSchema)
  async adminResetPassword(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: AdminResetPasswordDto,
  ) {
    const { user } = req;
    return this.usersService.adminResetPassword(
      { id: user.id, role: user.role },
      dto,
    );
  }
}
