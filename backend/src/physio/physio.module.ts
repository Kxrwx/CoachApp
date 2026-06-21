//src/physio/physio.module.ts
import { Module } from '@nestjs/common';
import { UserPhysiologyService } from './physio.service';
import { UserPhysiologyController } from './physio.controller';
import { PrismaModule } from '../prisma/prisma.module'; 
import { R2Module } from '@/r2/r2.module';

@Module({
  imports: [PrismaModule, R2Module], 
  controllers: [UserPhysiologyController],
  providers: [UserPhysiologyService],
  exports: [UserPhysiologyModule],
})
export class UserPhysiologyModule {}