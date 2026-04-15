import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- SIGNUP ---
  @UseGuards(ThrottlerGuard)
  @Post('signup')
  async signUp(
    @Body() body: { email: string; pass: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const tokens = await this.authService.signUp(
      body.email,
      body.pass,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown'
    );

    this.setRefreshCookie(res, tokens.refresh_token);

    return { access_token: tokens.access_token };
  }

  // --- SIGNIN ---
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(
    @Body() body: { email: string; pass: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const tokens = await this.authService.signIn(
      body.email,
      body.pass,
      req.ip ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown'
    );

    this.setRefreshCookie(res, tokens.refresh_token);

    return { access_token: tokens.access_token };
  }

  // --- LOGOUT ---
  @UseGuards(ThrottlerGuard)
  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    await this.authService.logout(req.user.sid);

    res.clearCookie('refresh_token', {
      path: '/auth',
    });

    return { message: 'Déconnecté' };
  }

  // --- ME ---
  @UseGuards(AuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return {
      user: {
        id: req.user.sub,
        email: req.user.email,
      },
    };
  }

  // --- REFRESH ---
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const rt = req.cookies?.['refresh_token'];

    if (!rt) {
      throw new UnauthorizedException('Refresh token manquant');
    }

    const tokens = await this.authService.refreshTokens(rt);

    this.setRefreshCookie(res, tokens.refresh_token);

    return { access_token: tokens.access_token };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });
  }
}