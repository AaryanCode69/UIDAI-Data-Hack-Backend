import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AuthenticatedUser } from './interfaces/auth.interface';

const logger = new Logger('SupabaseJwtUtil');

export interface JwtVerificationResult {
  valid: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// JWKS client cache
let jwksClientInstance: jwksClient.JwksClient | null = null;

/**
 * Gets or creates the JWKS client for Supabase
 */
function getJwksClient(supabaseUrl: string): jwksClient.JwksClient {
  if (!jwksClientInstance) {
    jwksClientInstance = jwksClient({
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
    });
  }
  return jwksClientInstance;
}

/**
 * Gets the signing key from JWKS
 */
async function getSigningKey(
  client: jwksClient.JwksClient,
  kid: string,
): Promise<string> {
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
}

/**
 * Verifies a Supabase JWT token using JWKS (ES256) or secret (HS256)
 */
export async function verifySupabaseJwt(
  token: string,
  secret: string,
  supabaseUrl?: string,
): Promise<JwtVerificationResult> {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Decode header to check algorithm
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader) {
      return { valid: false, error: 'Invalid token format' };
    }

    const { alg, kid } = decodedHeader.header;
    let decoded: jwt.JwtPayload;

    if (alg === 'ES256' && kid && supabaseUrl) {
      // Use JWKS verification for ES256
      logger.debug('Using JWKS verification (ES256)');
      const client = getJwksClient(supabaseUrl);
      const publicKey = await getSigningKey(client, kid);

      decoded = jwt.verify(token, publicKey, {
        algorithms: ['ES256'],
      }) as jwt.JwtPayload;
    } else if (alg === 'HS256') {
      // Use secret for HS256
      logger.debug('Using secret verification (HS256)');

      if (!secret) {
        return { valid: false, error: 'JWT secret not configured' };
      }

      try {
        decoded = jwt.verify(token, secret, {
          algorithms: ['HS256'],
        }) as jwt.JwtPayload;
      } catch {
        // Try base64-decoded secret
        const decodedSecret = Buffer.from(secret, 'base64');
        decoded = jwt.verify(token, decodedSecret, {
          algorithms: ['HS256'],
        }) as jwt.JwtPayload;
      }
    } else {
      return { valid: false, error: `Unsupported algorithm: ${alg}` };
    }

    // Extract user information from the token
    const user: AuthenticatedUser = {
      sub: decoded.sub as string,
      email: decoded.email as string | undefined,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    // Validate required fields
    if (!user.sub) {
      return { valid: false, error: 'Token missing subject (sub) claim' };
    }

    return { valid: true, user };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token has expired' };
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }

    logger.error('Unexpected error during JWT verification', error);
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Extracts the token from the Authorization header
 */
export function extractTokenFromHeader(
  authHeader: string | undefined,
): string | null {
  if (!authHeader) {
    return null;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return null;
  }

  return token;
}
