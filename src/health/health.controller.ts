import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';

@Controller('health')
export class HealthController {
  /**
   * Public health check endpoint
   * Used by load balancers and monitoring tools
   */
  @Get()
  check(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Protected endpoint to verify authentication
   * Returns the authenticated user's information
   */
  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: Request): { user: AuthenticatedUser | undefined } {
    return {
      user: request.user,
    };
  }
}
