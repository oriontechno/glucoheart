import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import { ZodValidation } from '../zod/zod-validation.decorator';
import {
  createRoomSchema,
  discussionSendMessageSchema,
  type CreateRoomDto,
  type DiscussionSendMessageDto,
} from './schema/discussion.schema';
import { Request } from 'express';
import { RequestUser } from './types';

@Controller('discussion')
export class DiscussionController {
  constructor(private readonly svc: DiscussionService) {}

  @Get('all')
  async getAllSimple(
    @Query('search') search?: string,
    @Query('isPublic') isPublic?: string,
    @Query('createdBy') createdBy?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAllSimple({
      search,
      isPublic,
      createdBy,
      limit: Number(limit),
    });
  }

  @Get('search')
  async getSearch(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isPublic') isPublic?: string,
    @Query('createdBy') createdBy?: string,
    @Query('sort') sort?: string,
  ) {
    return this.svc.findPaginated({
      page: Number(page),
      limit: Number(limit),
      search,
      isPublic,
      createdBy,
      sort,
    });
  }

  // Create public room (ADMIN only)
  @Post('rooms')
  @ZodValidation(createRoomSchema)
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
  @ZodValidation(discussionSendMessageSchema)
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
