import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Pastikan payload memiliki data yang diharapkan
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    this.logger.log(`Validating JWT for user ID: ${payload.sub}`);

    // Return user dari payload token
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
