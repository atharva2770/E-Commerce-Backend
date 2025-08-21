import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { CustomError } from '@/middleware/error.middleware';
import { CreateUserDto, LoginDto } from '@/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithoutPassword {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a password using bcrypt
   */
  private static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  private static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate simple tokens (placeholder for JWT implementation)
   */
  private static generateTokens(userId: string, _email: string, _role: string): AuthTokens {
    // Placeholder implementation - in real app, use JWT
    const accessToken = `access_${userId}_${Date.now()}`;
    const refreshToken = `refresh_${userId}_${Date.now()}`;

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user
   */
  static async register(userData: CreateUserDto): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
    const { email, password, firstName, lastName, role = 'CUSTOMER' } = userData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new CustomError('User already exists', 409);
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);

    return { user, tokens };
  }

  /**
   * Login user
   */
  static async login(loginData: LoginDto): Promise<{ user: UserWithoutPassword; tokens: AuthTokens }> {
    const { email, password } = loginData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await this.comparePassword(password, user.password);

    if (!isValidPassword) {
      throw new CustomError('Invalid credentials', 401);
    }

    // Generate tokens
    const tokens = this.generateTokens(user.id, user.email, user.role);

    // Return user without password
    const userWithoutPassword: UserWithoutPassword = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userWithoutPassword, tokens };
  }

  /**
   * Refresh access token (placeholder)
   */
  static async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Placeholder implementation - in real app, verify JWT refresh token
    if (!refreshToken.startsWith('refresh_')) {
      throw new CustomError('Invalid refresh token', 401);
    }

    // Extract user ID from token (simple implementation)
    const parts = refreshToken.split('_');
    if (parts.length < 3) {
      throw new CustomError('Invalid refresh token', 401);
    }

    const userId = parts[1];

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: userId || '' },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Generate new access token
    const accessToken = `access_${user.id}_${Date.now()}`;

    return { accessToken };
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserWithoutPassword> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    return user;
  }

  /**
   * Verify token (placeholder)
   */
  static verifyToken(token: string): { userId: string; email: string; role: string } {
    // Placeholder implementation - in real app, verify JWT
    if (!token.startsWith('access_')) {
      throw new CustomError('Invalid token', 401);
    }

    const parts = token.split('_');
    if (parts.length < 3) {
      throw new CustomError('Invalid token', 401);
    }

    const userId = parts[1] || '';
    
    // In a real implementation, you would decode JWT and verify signature
    // For now, return placeholder data
    return {
      userId,
      email: 'user@example.com', // Would come from JWT payload
      role: 'CUSTOMER', // Would come from JWT payload
    };
  }

  /**
   * Forgot password - send reset email
   */
  static async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // In real implementation, generate reset token and send email
    // For now, just log the action
    console.log(`Password reset requested for email: ${email}`);
  }

  /**
   * Reset password
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Placeholder implementation - in real app, verify reset token
    if (!token || token.length < 10) {
      throw new CustomError('Invalid reset token', 400);
    }

    // In real implementation, decode and verify reset token
    // For now, assume token contains user ID
    const userId = token.substring(0, 36); // Assume UUID length

    const hashedPassword = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
}
