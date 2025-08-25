import {
  Injectable,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { TokenBlacklistService } from '../token-blacklist.service';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private tokenBlacklistService: TokenBlacklistService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    // Periksa apakah token ada dalam blacklist
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      const token = authHeader.split(' ')[1];
      if (this.tokenBlacklistService.isBlacklisted(token)) {
        this.logger.log('Token blacklisted, access denied');
        throw new UnauthorizedException('Token has been invalidated');
      }
    }

    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Tambahkan logging untuk debug
    if (err || !user) {
      this.logger.error(
        'Authentication failed:',
        err?.message || 'No user found',
      );
      this.logger.error('Auth info:', info);
      throw err || new UnauthorizedException('Authentication required');
    }

    return user;
  }
}
