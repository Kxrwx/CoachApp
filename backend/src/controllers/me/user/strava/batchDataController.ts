import cron from 'node-cron';
import prisma from '../../../../utils/prisma';

async function executerNettoyage() {
    const maintenanceDate = new Date();
    console.log(`[${maintenanceDate.toISOString()}] 🧹 Nettoyage des données obsolètes...`);

    try {
        const limit30Days = new Date();
        limit30Days.setDate(limit30Days.getDate() - 30);

        const limit13Months = new Date();
        limit13Months.setMonth(limit13Months.getMonth() - 13);

        const limit5Years = new Date();
        limit5Years.setFullYear(limit5Years.getFullYear() - 5);

        const deletedActivities = await prisma.stravaRecentActivityBike.deleteMany({
            where: { startDate: { lt: limit30Days } }
        });

        const deletedMonths = await prisma.stravaMonthlyStatsBike.deleteMany({
            where: {
                OR: [
                    { year: { lt: limit13Months.getFullYear() } },
                    { 
                        year: limit13Months.getFullYear(), 
                        month: { lt: limit13Months.getMonth() + 1 } 
                    }
                ]
            }
        });

        const deletedYears = await prisma.stravaYearlyStatsBike.deleteMany({
            where: { year: { lt: limit5Years.getFullYear() } }
        });

        console.log(`✅ Nettoyage terminé :`);
        console.log(`   - Activités supprimées : ${deletedActivities.count}`);
        console.log(`   - Mois supprimés : ${deletedMonths.count}`);
        console.log(`   - Années supprimées : ${deletedYears.count}`);

        return { success: true };
    } catch (error) {
        console.error(`❌ Erreur lors du nettoyage :`, error);
        return { success: false };
    }
}

cron.schedule('0 3 * * *', async () => {
    await executerNettoyage();
}, { timezone: "Europe/Paris" });