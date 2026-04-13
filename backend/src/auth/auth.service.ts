import { Injectable, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  // --- SIGNUP / SIGNIN ---
  async signUp(email: string, pass: string, ip: string, userAgent: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new ConflictException('Email déjà utilisé');

    const hashedPassword = await bcrypt.hash(pass, 10);
    const user = await this.prisma.user.create({ data: { email, passwordHash: hashedPassword } });

    return this.generateTokens(user.id, user.email, ip, userAgent);
  }

  async signIn(email: string, pass: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
      throw new UnauthorizedException('Identifiants incorrects');
    }
    return this.generateTokens(user.id, user.email, ip, userAgent);
  }

  // --- REFRESH : APPROCHE OPAQUE & ROTATION ---
  async refreshTokens(opaqueToken: string) {
    const decoded = Buffer.from(opaqueToken, 'base64').toString();
    const [sid, secret] = decoded.split('.');
    if (!sid || !secret) throw new UnauthorizedException('Format invalide');

    const session = await this.prisma.session.findUnique({
      where: { id: sid },
      include: { user: true }
    });

    if (!session || session.revoked || session.expiredAt < new Date()) {
      throw new ForbiddenException('Session invalide ou expirée');
    }

    const incomingHash = createHash('sha256').update(secret).digest('hex');
    const storedHash = Buffer.from(session.tokenHash);
    const targetHash = Buffer.from(incomingHash);

    if (targetHash.length !== storedHash.length || !timingSafeEqual(storedHash, targetHash)) {
      await this.prisma.session.update({ where: { id: sid }, data: { revoked: true } });
      throw new ForbiddenException('Alerte sécurité : Rotation compromise');
    }

    return this.updateSessionAndTokens(session.id, session.user.id, session.user.email);
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revoked: true } });
    return { message: 'Déconnecté' };
  }



  // --- HELPERS PRIVÉS ---

  private async generateTokens(userId: string, email: string, ip: string, userAgent: string) {
    const secret = randomUUID();
    const hash = createHash('sha256').update(secret).digest('hex');

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hash,
        ip,
        userAgent,
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return this.formatResponse(userId, email, session.id, secret);
  }

  private async updateSessionAndTokens(sid: string, userId: string, email: string) {
    const newSecret = randomUUID();
    const newHash = createHash('sha256').update(newSecret).digest('hex');

    await this.prisma.session.update({
      where: { id: sid },
      data: { 
        tokenHash: newHash, 
        lastSeen: new Date(),

        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      },
    });

    return this.formatResponse(userId, email, sid, newSecret);
  }

  private async formatResponse(userId: string, email: string, sid: string, secret: string) {
    const access_token = await this.jwtService.signAsync(
      { sub: userId, email, sid, type: 'access' },
      { expiresIn: '15m' }
    );

    const refresh_token = Buffer.from(`${sid}.${secret}`).toString('base64');

    return { access_token, refresh_token };
  }
}