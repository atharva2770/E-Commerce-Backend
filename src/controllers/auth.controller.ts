import { Request, Response } from 'express';
import { AuthService } from '@/services/auth.service';
import { CreateUserDto, LoginDto } from '@/types';

export const authController = {
  async register(req: Request, res: Response) {
    const userData: CreateUserDto = req.body;

    const { user, tokens } = await AuthService.register(userData);

    res.status(201).json({
      success: true,
      data: {
        user,
        ...tokens,
      },
      message: 'User registered successfully',
    });
  },

  async login(req: Request, res: Response) {
    const loginData: LoginDto = req.body;

    const { user, tokens } = await AuthService.login(loginData);

    res.json({
      success: true,
      data: {
        user,
        ...tokens,
      },
      message: 'Login successful',
    });
  },

  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new Error('Refresh token required');
    }

    const { accessToken } = await AuthService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken,
      },
      message: 'Token refreshed successfully',
    });
  },

  async logout(_req: Request, res: Response) {
    // In real implementation, invalidate the token
    res.json({
      success: true,
      message: 'Logout successful',
    });
  },

  async getProfile(req: Request, res: Response) {
    // This should be called after authenticateToken middleware
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const user = await AuthService.getProfile(userId);

    res.json({
      success: true,
      data: { user },
      message: 'Profile retrieved successfully',
    });
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    await AuthService.forgotPassword(email);

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent',
    });
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new Error('Token and new password are required');
    }

    await AuthService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  },
};
