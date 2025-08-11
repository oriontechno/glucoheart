import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      // Jika user data sudah ada di client, berarti sudah diverifikasi
      if (client.data?.user) {
        return true;
      }

      const token = client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new WsException('Token tidak ditemukan');
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Simpan data user di client socket
      client.data.user = {
        id: payload.sub,
        role: payload.role,
      };

      return true;
    } catch (error) {
      throw new WsException('Token tidak valid');
    }
  }
}
