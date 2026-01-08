import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/availability-schedules', async (req, res) => {
    try {
        const userId = 1;

        const schedules = await prisma.availabilitySchedule.findMany({
            where: { userId },
            include: {
                availabilities: {
                    orderBy: { dayOfWeek: 'asc' },
                },
                _count: {
                    select: { eventTypes: true },
                },
            },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'asc' },
            ],
        });

        res.json(schedules);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/availability-schedules', async (req, res) => {
    try {
        const userId = 1;
        const { name, isDefault, availabilities } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Schedule name is required' });
        }

        if (!availabilities || !Array.isArray(availabilities)) {
            return res.status(400).json({ error: 'Availabilities array is required' });
        }

        // Validate availability data
        for (const avail of availabilities) {
            if (
                typeof avail.dayOfWeek !== 'number' ||
                avail.dayOfWeek < 0 ||
                avail.dayOfWeek > 6
            ) {
                return res.status(400).json({ error: 'Invalid dayOfWeek (must be 0-6)' });
            }
            if (!avail.startTime || !avail.endTime) {
                return res.status(400).json({ error: 'startTime and endTime are required' });
            }
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(avail.startTime) || !timeRegex.test(avail.endTime)) {
                return res.status(400).json({ error: 'Invalid time format (use HH:MM)' });
            }
        }

        if (isDefault) {
            await prisma.availabilitySchedule.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const schedule = await prisma.availabilitySchedule.create({
            data: {
                name,
                isDefault: isDefault || false,
                userId,
                availabilities: {
                    create: availabilities.map((avail) => ({
                        dayOfWeek: avail.dayOfWeek,
                        startTime: avail.startTime,
                        endTime: avail.endTime,
                    })),
                },
            },
            include: {
                availabilities: true,
            },
        });

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/availability-schedules/:id', async (req, res) => {
    try {
        const userId = 1;
        const { id } = req.params;
        const { name, availabilities } = req.body;

        const existingSchedule = await prisma.availabilitySchedule.findFirst({
            where: { id: parseInt(id), userId },
        });

        if (!existingSchedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        if (availabilities) {
            for (const avail of availabilities) {
                if (
                    typeof avail.dayOfWeek !== 'number' ||
                    avail.dayOfWeek < 0 ||
                    avail.dayOfWeek > 6
                ) {
                    return res.status(400).json({ error: 'Invalid dayOfWeek (must be 0-6)' });
                }
                if (!avail.startTime || !avail.endTime) {
                    return res.status(400).json({ error: 'startTime and endTime are required' });
                }
                const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                if (!timeRegex.test(avail.startTime) || !timeRegex.test(avail.endTime)) {
                    return res.status(400).json({ error: 'Invalid time format (use HH:MM)' });
                }
            }

            await prisma.availability.deleteMany({
                where: { scheduleId: parseInt(id) },
            });

            await prisma.availability.createMany({
                data: availabilities.map((avail) => ({
                    dayOfWeek: avail.dayOfWeek,
                    startTime: avail.startTime,
                    endTime: avail.endTime,
                    scheduleId: parseInt(id),
                })),
            });
        }

        const updatedSchedule = await prisma.availabilitySchedule.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
            },
            include: {
                availabilities: {
                    orderBy: { dayOfWeek: 'asc' },
                },
            },
        });

        res.json(updatedSchedule);
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/availability-schedules/:id', async (req, res) => {
    try {
        const userId = 1;
        const { id } = req.params;

        // Check if schedule exists and belongs to user
        const schedule = await prisma.availabilitySchedule.findFirst({
            where: { id: parseInt(id), userId },
            include: {
                _count: {
                    select: { eventTypes: true },
                },
            },
        });

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        if (schedule._count.eventTypes > 0) {
            return res.status(400).json({
                error: `Cannot delete schedule assigned to ${schedule._count.eventTypes} event type(s)`,
            });
        }

        const scheduleCount = await prisma.availabilitySchedule.count({
            where: { userId },
        });

        if (scheduleCount === 1) {
            return res.status(400).json({
                error: 'Cannot delete the only schedule. Create another schedule first.',
            });
        }

        await prisma.availabilitySchedule.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/availability-schedules/:id/set-default', async (req, res) => {
    try {
        const userId = 1;
        const { id } = req.params;

        // Check if schedule exists and belongs to user
        const schedule = await prisma.availabilitySchedule.findFirst({
            where: { id: parseInt(id), userId },
        });

        if (!schedule) {
            return res.status(404).json({ error: 'Schedule not found' });
        }

        await prisma.availabilitySchedule.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false },
        });

        const updatedSchedule = await prisma.availabilitySchedule.update({
            where: { id: parseInt(id) },
            data: { isDefault: true },
            include: {
                availabilities: true,
            },
        });

        res.json(updatedSchedule);
    } catch (error) {
        console.error('Error setting default schedule:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
