import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
    await this.verifyPostGIS();
  }

  async onModuleDestroy(): Promise<void> {
    await this.disconnect();
  }

  /**
   * Establishes a connection pool to PostgreSQL using DATABASE_URL
   */
  private async connect(): Promise<void> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      this.logger.error('DATABASE_URL environment variable is not set');
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        max: 10, // Maximum number of connections in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test the connection
      const client = await this.pool.connect();
      client.release();

      this.logger.log('✅ Database connection established successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to the database', error);
      throw error;
    }
  }

  /**
   * Verifies that PostGIS extension is available
   */
  private async verifyPostGIS(): Promise<void> {
    try {
      const result = await this.query<{ version: string }>(
        'SELECT PostGIS_Version() as version',
      );
      const version = result.rows[0]?.version;

      if (version) {
        this.logger.log(`✅ PostGIS is available - Version: ${version}`);
      } else {
        this.logger.warn('⚠️ PostGIS extension may not be enabled');
      }
    } catch (error) {
      this.logger.error(
        '❌ Failed to verify PostGIS - ensure the extension is enabled in Supabase',
        error,
      );
      throw error;
    }
  }

  /**
   * Gracefully closes all database connections
   */
  private async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Database connection pool closed');
    }
  }

  /**
   * Executes a SQL query and returns the result
   * @param text - SQL query string
   * @param params - Query parameters (optional)
   */
  async query<T = unknown>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();

    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      this.logger.debug(`Query executed in ${duration}ms`);

      return {
        rows: result.rows as T[],
        rowCount: result.rowCount ?? 0,
      };
    } catch (error) {
      this.logger.error(`Query failed: ${text}`, error);
      throw error;
    }
  }

  /**
   * Gets a client from the pool for transaction support
   * Remember to release the client after use
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Checks if the database connection is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
