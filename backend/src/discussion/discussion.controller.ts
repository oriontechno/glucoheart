import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { DiscussionSendMessageDto } from './dto/send-message.dto';
import { Request } from 'express';
import { RequestUser } from './types';

@Controller('discussion')
export class DiscussionController {
  constructor(private readonly svc: DiscussionService) {}

  // Create public room (ADMIN only)
  @Post('rooms')
  async createRoom(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateRoomDto,
  ) {
    const { user } = req;
    return this.svc.createRoom({ id: user.id, role: user.role }, dto);
  }

  // List public rooms
  @Get('rooms')
  async listRooms() {
    return this.svc.listRooms();
  }

  // Join / leave
  @Post('rooms/:roomId/join')
  async joinRoom(
    @Req() req: Request & { user: RequestUser },
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    const { user } = req;
    return this.svc.joinRoom(roomId, user.id);
  }

  @Post('rooms/:roomId/leave')
  async leaveRoom(
    @Req() req: Request & { user: RequestUser },
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    const { user } = req;
    return this.svc.leaveRoom(roomId, user.id);
  }

  // Send / Fetch messages
  @Post('rooms/:roomId/message')
  async sendMessage(
    @Req() req: Request & { user: RequestUser },
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: DiscussionSendMessageDto,
  ) {
    const { user } = req;
    return this.svc.sendMessage(roomId, user.id, dto);
  }

  @Get('rooms/:roomId/messages')
  async fetchMessages(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.svc.fetchMessages(roomId);
  }
}
