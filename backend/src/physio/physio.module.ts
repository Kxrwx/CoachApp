import { Module } from '@nestjs/common';
import { UserPhysiologyService } from './physio.service';
import { UserPhysiologyController } from './physio.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Ajuste le chemin

@Module({
  imports: [PrismaModule],
  controllers: [UserPhysiologyController],
  providers: [UserPhysiologyService],
  exports: [UserPhysiologyModule],
})
export class UserPhysiologyModule {}