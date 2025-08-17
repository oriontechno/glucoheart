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
type RequestUser = {
  id: number;
  role?: 'ADMIN' | 'SUPPORT' | 'NURSE' | 'USER';
};

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
