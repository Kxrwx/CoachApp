// src/auth/auth.service.ts
import { Injectable, ConflictException, UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  /**
   *
   *
   * @param {string} email => l'email de l'utilisateur
   * @param {string} pass => le mot de passe de l'utilisateur
   * @param {string} ip => l'adresse IP de l'utilisateur
   * @param {string} userAgent => l'user agent du navigateur
   * @return {*} => creer un utilisateur dans la db
   * @memberof AuthService
   */
  async signUp(email: string, pass: string, ip: string, userAgent: string) {
    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new ConflictException('Email déjà utilisé');

    const hashedPassword = await bcrypt.hash(pass, 10);
    const user = await this.prisma.user.create({ data: { email, passwordHash: hashedPassword } });

    const metrics = await this.prisma.metric.findMany({
      where: {
        key: {
          in: [
            'ride_max_distance_km', 'ride_max_elevation_gain', 'ride_max_duration_hours',
            'power_avg', 'power_max', 'ftp', 'ride_max_avg_watts',
            'power_3s', 'power_30s', 'power_1min', 'power_2min', 'power_5min',
            'power_10min', 'power_20min', 'power_1h', 'power_2h', 'power_4h',
            'cadence_avg', 'cadence_max', 'hr_avg', 'hr_max',
            'speed_avg', 'speed_max', 'kj_total', 'tss', 'if'
          ]
        }
      }
    });

  if (metrics.length > 0) {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    await this.prisma.personalRecord.createMany({
      data: metrics.map((metric) => ({
        userId: user.id,
        metricId: metric.id,
        value: 0,
        period: "all_time",
        achievedAt: now,
      })),
    });
  }

    return this.generateTokens(user.id, user.email, ip, userAgent);
  }

  /**
   *
   *
   * @param {string} email => l'email de l'utilisateur
   * @param {string} pass => le mot de passe de l'utilisateur
   * @param {string} ip => l'adresse IP de l'utilisateur
   * @param {string} userAgent => l'user agent du navigateur
   * @return {*} => connecter l'utilisateur
   * @memberof AuthService
   */
  async signIn(email: string, pass: string, ip: string, userAgent: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(pass, user.passwordHash))) {
      console.warn(`[AUTH] Failed login for ${email} from ${ip}`);
      throw new UnauthorizedException('Identifiants incorrects');
    }

    return this.generateTokens(user.id, user.email, ip, userAgent);
  }

  /**
   *
   *
   * @param {string} opaqueToken => le token opaque pour rafraichir la session
   * @return {*} => rafraichir les tokens de l'utilisateur
   * @memberof AuthService
   */
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
      console.warn(`[AUTH] Refresh token invalid for session ${sid}`);
      throw new ForbiddenException('Alerte sécurité : Rotation compromise');
    }

    return this.updateSessionAndTokens(session.id, session.user.id, session.user.email);
  }

  /**
   *
   *
   * @param {string} sessionId => l'id de la session a revoquer
   * @return {*} => deconnecter l'utilisateur
   * @memberof AuthService
   */
  async logout(sessionId: string) {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revoked: true } });
    return { message: 'Déconnecté' };
  }

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @return {*} => recuperer les infos de l'utilisateur
   * @memberof AuthService
   */
async getMe(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
      roles: {
        select: {
          id: true,
          role: true,
        },
      },
      integrations: {
        select: {
          usersStrava: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé');
  }

  return user;
}

/**
   *
   *
   * @param {string} userId => l'id de l'utilisateur de l'app
   * @param {object} data => les datas a mettre a jour
   * @return {*} => mettre a jour les infos de l'utilisateur
   * @memberof AuthService
   */
  async updateMe(userId: string, data: { password?: string; mfaEnabled?: boolean }) {
  return await this.prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: data.password ? await bcrypt.hash(data.password, 10) : undefined,
      mfaEnabled: data.mfaEnabled !== undefined ? data.mfaEnabled : undefined,
    },
  });
}
  




  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @param {string} email => l'email de l'utilisateur
   * @param {string} ip => l'adresse IP de l'utilisateur
   * @param {string} userAgent => l'user agent du navigateur
   * @return {*} => generer les tokens de la session
   * @memberof AuthService
   */
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

  /**
   *
   *
   * @param {string} sid => l'id de la session
   * @param {string} userId => l'id de l'utilisateur
   * @param {string} email => l'email de l'utilisateur
   * @return {*} => mettre a jour la session et les tokens
   * @memberof AuthService
   */
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

  /**
   *
   *
   * @param {string} userId => l'id de l'utilisateur
   * @param {string} email => l'email de l'utilisateur
   * @param {string} sid => l'id de la session
   * @param {string} secret => le secret de la session
   * @return {*} => formater la reponse avec les tokens
   * @memberof AuthService
   */
  private async formatResponse(userId: string, email: string, sid: string, secret: string) {
    const access_token = await this.jwtService.signAsync(
      { sub: userId, email, sid, type: 'access' },
      { expiresIn: '15m' }
    );

    const refresh_token = Buffer.from(`${sid}.${secret}`).toString('base64');

    return { access_token, refresh_token };
  }

  
}