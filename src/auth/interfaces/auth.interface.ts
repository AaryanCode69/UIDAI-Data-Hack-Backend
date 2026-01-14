/**
 * Represents the authenticated user extracted from Supabase JWT
 */
export interface AuthenticatedUser {
  /** Supabase user ID (UUID) */
  sub: string;
  /** User email (if available) */
  email?: string;
  /** Token issued at timestamp */
  iat?: number;
  /** Token expiration timestamp */
  exp?: number;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
