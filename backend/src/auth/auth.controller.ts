import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { TokenBlacklistService } from './token-blacklist.service';
import { JwtService } from '@nestjs/jwt';
import { ZodValidation } from '../zod/zod-validation.decorator';
import type {
  CreateRegisterDto,
  CreateLoginDto,
} from './schema/register.schema';
import {
  createRegisterSchema,
  createLoginSchema,
} from './schema/register.schema';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @ZodValidation(createRegisterSchema)
  @Post('register')
  register(@Body() createRegisterDto: CreateRegisterDto) {
    return this.authService.register(createRegisterDto);
  }

  @Public()
  @ZodValidation(createLoginSchema)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: CreateLoginDto) {
    // Validasi manual di controller menggunakan AuthService
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.email}`);
    return this.authService.generateToken(user);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any, @Req() req: Request) {
    this.logger.log(
      'Get profile request headers:',
      JSON.stringify(req.headers),
    );
    this.logger.log('Current user from token:', user);
    return this.authService.getProfile(user.id);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // This route initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    const { access_token, user } = await this.authService.validateGoogleUser(
      req.user,
    );

    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    // Send the token and user data to the frontend
    res.redirect(
      `${frontendUrl}/auth-callback?token=${access_token}&user=${JSON.stringify(user)}`,
    );
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  refreshToken(@CurrentUser() user: any) {
    return this.authService.generateToken(user);
  }

  @Public()
  @Get('check')
  checkApiStatus(@Req() req: Request) {
    this.logger.log('Check API headers:', JSON.stringify(req.headers));
    return {
      status: 'API is working',
      time: new Date().toISOString(),
    };
  }

  // Endpoint baru untuk logout
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
        const token = authHeader.split(' ')[1];
        const decoded = this.jwtService.decode(token);

        // Menambahkan token ke blacklist
        if (decoded && typeof decoded === 'object' && decoded.exp) {
          const expiryDate = new Date(decoded.exp * 1000);
          this.tokenBlacklistService.blacklistToken(token, expiryDate);

          this.logger.log(
            `User logged out successfully. Token blacklisted until: ${expiryDate}`,
          );
          return { message: 'Logout successful' };
        }
      }

      return { message: 'Logout successful' };
    } catch (error) {
      this.logger.error('Logout error:', error);
      return { message: 'Logout successful' }; // Tetap return success meskipun ada error
    }
  }
}
