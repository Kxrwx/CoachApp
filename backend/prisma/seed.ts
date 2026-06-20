import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding des rôles...');

  // 1. Colle ici l'ID de l'utilisateur que tu veux passer Coach
  const targetUserId = '28ea8921-1794-40cf-b662-2a628e7ba218'; 

  // 2. On vérifie d'abord si cet utilisateur existe vraiment en BDD
  const userExists = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!userExists) {
    throw new Error(`L'utilisateur avec l'ID "${targetUserId}" n'existe pas en base de données. Connecte-toi d'abord sur l'application pour créer ton compte.`);
  }

  console.log(`👤 Utilisateur trouvé : ${userExists.email}`);

  // 3. On lui attribue le rôle COACH s'il ne l'a pas déjà
  const assignedRole = await prisma.userRole.upsert({
    where: {
      userId_role: { 
        userId: targetUserId, 
        role: 'COACH' 
      },
    },
    update: {}, // S'il est déjà coach, on ne change rien
    create: {
      userId: targetUserId,
      role: 'COACH',
    },
  });

  console.log(`✅ Succès ! Le rôle ${assignedRole.role} a été attribué à l'ID : ${targetUserId}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });