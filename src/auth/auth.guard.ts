import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { extractTokenFromHeader, verifySupabaseJwt } from './supabase-jwt.util';
import { AuthenticatedUser } from './interfaces/auth.interface';

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly jwtSecret: string;
  private readonly supabaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    if (!secret) {
      this.logger.warn('SUPABASE_JWT_SECRET not configured');
    }
    if (!supabaseUrl) {
      this.logger.warn('SUPABASE_URL not configured - ES256 tokens will fail');
    }

    this.jwtSecret = secret ?? '';
    this.supabaseUrl = supabaseUrl ?? '';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract token from Authorization header
    const token = extractTokenFromHeader(request.headers.authorization);

    if (!token) {
      this.logger.debug('No token provided in Authorization header');
      throw new UnauthorizedException('Missing authentication token');
    }

    // Verify the JWT token (async for JWKS support)
    const result = await verifySupabaseJwt(
      token,
      this.jwtSecret,
      this.supabaseUrl,
    );

    if (!result.valid || !result.user) {
      this.logger.debug(`Authentication failed: ${result.error}`);
      throw new UnauthorizedException(result.error ?? 'Authentication failed');
    }

    // Attach user to request object
    request.user = result.user;

    this.logger.debug(`User authenticated: ${result.user.sub}`);
    return true;
  }
}
