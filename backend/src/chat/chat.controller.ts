import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ZodValidation } from '../zod/zod-validation.decorator';
import {
  createSessionByRoleSchema,
  sendMessageSchema,
  assignNurseSchema,
  chatTargetRoles,
  type CreateSessionByRoleDto,
  type SendMessageDto,
  type AssignNurseDto,
} from './schema/chat.schema';
import { Request } from 'express';
import { RequestUser } from './types';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  // POST /chat/session : create/get 1:1 session by concrete userId
  // @Post('session')
  // async createOrGetSession(
  //   @Req() req: Request & { user: RequestUser },
  //   @Body() dto: CreateSessionDto,
  // ) {
  //   const { user } = req; // Ensure your AuthGuard sets req.user
  //   return this.chat.getOrCreateOneToOneSession(user.id, dto);
  // }

  // POST /chat/session/by-role : create/get 1:1 session targeting a role (ADMIN/SUPPORT)
  @Post('session')
  // @ZodValidation(createSessionByRoleSchema)
  async createOrGetSessionByRole(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateSessionByRoleDto,
  ) {
    const { user } = req;
    // Default to ADMIN if frontend sends nothing (optional)
    const role = dto.role ?? 'ADMIN';
    return this.chat.getOrCreateOneToOneSessionByRole(user.id, role);
  }

  // POST /chat/session/:sessionId/message : send message
  @Post('session/:sessionId/message')
  // @ZodValidation(sendMessageSchema)
  async sendMessage(
    @Req() req: Request & { user: RequestUser },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: SendMessageDto,
  ) {
    const { user } = req;
    return this.chat.sendMessage(sessionId, user.id, dto);
  }

  // GET /chat/session/:sessionId/messages : fetch messages
  @Get('session/:sessionId/messages')
  async fetchMessages(
    @Req() req: Request & { user: RequestUser },
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    const { user } = req;
    return this.chat.fetchMessages(sessionId, user.id);
  }

  // GET /chat/sessions : list sessions for logged-in user
  @Get('sessions')
  async listSessions(@Req() req: Request & { user: RequestUser }) {
    const { user } = req;
    return this.chat.listSessions(user.id);
  }

  // POST /chat/session/:sessionId/assign-nurse : assign nurse (admin/support only)
  @Post('session/:sessionId/assign-nurse')
  // @ZodValidation(assignNurseSchema)
  async assignNurse(
    @Req() req: Request & { user: RequestUser },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: AssignNurseDto,
  ) {
    const { user } = req;
    return this.chat.assignNurse(
      sessionId,
      { id: user.id, role: user.role },
      dto,
    );
  }
}
