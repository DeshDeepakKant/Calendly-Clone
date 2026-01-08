import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateToSchedules() {
    console.log('Starting migration to availability schedules...');

    try {
        // Get all users
        const users = await prisma.user.findMany();

        for (const user of users) {
            console.log(`\nMigrating user: ${user.username}`);

            // Get user's existing availabilities
            const existingAvailabilities = await prisma.$queryRaw`
                SELECT * FROM availabilities WHERE userId = ${user.id}
            `;

            if (existingAvailabilities.length === 0) {
                console.log('  No availabilities found, skipping...');
                continue;
            }

            // Create default schedule for this user
            const defaultSchedule = await prisma.availabilitySchedule.create({
                data: {
                    name: 'Default Schedule',
                    isDefault: true,
                    userId: user.id,
                },
            });

            console.log(`  Created default schedule (ID: ${defaultSchedule.id})`);

            // Update existing availabilities to link to the new schedule
            for (const avail of existingAvailabilities) {
                await prisma.$executeRaw`
                    UPDATE availabilities 
                    SET scheduleId = ${defaultSchedule.id}
                    WHERE id = ${avail.id}
                `;
            }

            console.log(`  Migrated ${existingAvailabilities.length} availabilities`);
        }

        console.log('\nMigration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

migrateToSchedules();
