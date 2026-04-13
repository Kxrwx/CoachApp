import { 
  Controller, 
  Post, 
  Body, 
  Req, 
  UseGuards, 
  HttpCode, 
  HttpStatus, 
  UnauthorizedException 
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)

  @Post('signup')
  async signUp(@Body() body: { email: string; pass: string }, @Req() req: Request) {
    return this.authService.signUp(body.email, body.pass, req.ip ?? "unknown", req.headers['user-agent'] ?? "unknown");
  }
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  async signIn(@Body() body: { email: string; pass: string }, @Req() req: Request) {
    return this.authService.signIn(body.email, body.pass, req.ip ?? "unknown", req.headers['user-agent'] ?? "unknown");
  }
  @UseGuards(ThrottlerGuard)
  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.sid);
  }
  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') rt: string) {
    if (!rt) throw new UnauthorizedException('Refresh token manquant');
    return this.authService.refreshTokens(rt);
  }
}