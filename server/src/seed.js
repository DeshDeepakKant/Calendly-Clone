import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting database seeding...');

    // Create Admin User (ID = 1)
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@calendly-clone.com' },
        update: {},
        create: {
            username: 'admin',
            email: 'admin@calendly-clone.com',
            timeZone: 'Asia/Kolkata',
        },
    });

    console.log('Created admin user:', adminUser);

    // Create Default Availability Schedule
    const defaultSchedule = await prisma.availabilitySchedule.upsert({
        where: { id: 1 },
        update: {},
        create: {
            name: 'Default Schedule',
            isDefault: true,
            userId: adminUser.id,
        },
    });

    console.log('Created default schedule:', defaultSchedule);

    // Create Availability for Default Schedule (Monday to Friday, 9 AM - 5 PM)
    const availabilityDays = [1, 2, 3, 4, 5]; // Mon-Fri

    for (const day of availabilityDays) {
        await prisma.availability.upsert({
            where: {
                id: day, // Using day as ID for simplicity in seeding
            },
            update: {},
            create: {
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '17:00',
                scheduleId: defaultSchedule.id,
            },
        });
    }

    console.log('Created availability (Mon-Fri, 9 AM - 5 PM)');

    // Create Event Type 1: 30-minute meeting (uses default schedule)
    const eventType1 = await prisma.eventType.upsert({
        where: { urlSlug: '30-min-meeting' },
        update: {},
        create: {
            title: '30 Minute Meeting',
            duration: 30,
            urlSlug: '30-min-meeting',
            description: 'A quick 30-minute meeting to discuss your needs.',
            color: '#006BFF',
            userId: adminUser.id,
            scheduleId: defaultSchedule.id,
        },
    });

    console.log('Created event type:', eventType1);

    // Create Event Type 2: 60-minute meeting (uses default schedule)
    const eventType2 = await prisma.eventType.upsert({
        where: { urlSlug: '60-min-meeting' },
        update: {},
        create: {
            title: '60 Minute Meeting',
            duration: 60,
            urlSlug: '60-min-meeting',
            description: 'An hour-long meeting for in-depth discussion.',
            color: '#00A86B',
            userId: adminUser.id,
            scheduleId: defaultSchedule.id,
        },
    });

    console.log('Created event type:', eventType2);

    console.log('Database seeding completed!');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
