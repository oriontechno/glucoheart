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

  @Get('metrics/growth')
  async growthChatSessions(
    @Query('period') period?: string, // day|week|month|year (default: month)
    @Query('from') from?: string, // ISO date (opsional)
    @Query('to') to?: string, // ISO date (opsional)
  ) {
    return this.chat.growthChatSessions({ period, from, to });
  }

  // ========== ADMIN/SUPPORT: Read messages dari sesi mana pun ==========
  @Get('admin/sessions/:sessionId/messages')
  async adminFetchMessages(
    @Req() req: Request & { user: RequestUser },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.chat.adminFetchMessages(
      { id: req.user.id, role: req.user.role },
      sessionId,
      {
        page: Number(page) || 1,
        limit: Math.min(200, Math.max(1, Number(limit) || 50)),
      },
    );
  }

  // ========== ADMIN/SUPPORT: Kirim pesan ke sesi mana pun ==========
  @Post('admin/sessions/:sessionId/message')
  async adminSendMessage(
    @Req() req: Request & { user: RequestUser },
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: { content: string },
  ) {
    return this.chat.adminSendMessage(
      { id: req.user.id, role: req.user.role },
      sessionId,
      dto,
    );
  }

  @Get('sessions/count')
  async countSessions(
    @Query('period') period?: string, // day|week|month|year|all
    @Query('from') from?: string, // ISO date (opsional)
    @Query('to') to?: string, // ISO date (opsional)
    @Query('type') type?: string, // one_to_one|group|all
    @Query('assigned') assigned?: string, // true|false
  ) {
    return this.chat.countSessions({ period, from, to, type, assigned });
  }

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

  // NEW: Admin – get all sessions (paged + search)
  @Get('sessions/admin')
  async listAllSessionsAdmin(
    @Req() req: Request & { user: RequestUser },
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('type') type?: 'one_to_one' | 'group',
  ) {
    const acting = { id: req.user.id, role: req.user.role };
    return this.chat.listAllSessionsAdmin(acting, {
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      search,
      type,
    });
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
