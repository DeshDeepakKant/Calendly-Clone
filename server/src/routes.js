import express from 'express';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from './services/emailService.js';
import { getBookingConfirmationClient, getBookingNotificationHost, getCancellationNotice } from './emails/templates.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/event-types/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const eventType = await prisma.eventType.findUnique({
            where: { urlSlug: slug },
            include: {
                user: {
                    select: {
                        username: true,
                        timeZone: true,
                    },
                },
            },
        });

        if (!eventType) {
            return res.status(404).json({ error: 'Event type not found' });
        }

        res.json(eventType);
    } catch (error) {
        console.error('Error fetching event type:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/slots', async (req, res) => {
    try {
        const { date, slug } = req.query;

        if (!date || !slug) {
            return res.status(400).json({ error: 'Missing required parameters: date and slug' });
        }

        // Parse the date and get day of week (0 = Sunday, 6 = Saturday)
        const selectedDate = new Date(date);
        const dayOfWeek = selectedDate.getDay();

        // Fetch event type with schedule
        const eventType = await prisma.eventType.findUnique({
            where: { urlSlug: slug },
            include: {
                user: true,
                schedule: {
                    include: {
                        availabilities: true,
                    },
                },
                customQuestions: {
                    orderBy: { position: 'asc' }
                }
            },
        });

        if (!eventType) {
            return res.status(404).json({ error: 'Event type not found' });
        }

        // Get the schedule to use (event type's schedule or default)
        let schedule = eventType.schedule;

        if (!schedule) {
            // Fall back to default schedule
            schedule = await prisma.availabilitySchedule.findFirst({
                where: {
                    userId: eventType.userId,
                    isDefault: true,
                },
                include: {
                    availabilities: true,
                    overrides: true,
                },
            });
        } else {
            // Fetch the specific schedule with overrides
            schedule = await prisma.availabilitySchedule.findUnique({
                where: { id: schedule.id },
                include: {
                    availabilities: true,
                    overrides: true,
                },
            });
        }

        if (!schedule || !schedule.availabilities) {
            return res.json({ slots: [] });
        }

        let activeAvailabilities = [];

        // Check for date override
        // Prisma stores dates with time, so we need to compare properly
        // Create start and end of the selected day in UTC to match how Prisma stores dates (or just compare date parts)
        // Since sqlite date filtering can be tricky, we'll do in-memory filter for the specific date
        // Better: use the dateOverride from memory loaded with schedule

        // Find override for this specific date
        const selectedDateString = selectedDate.toISOString().split('T')[0];

        const dateOverride = schedule.overrides.find(o => {
            const overrideDate = new Date(o.date).toISOString().split('T')[0];
            return overrideDate === selectedDateString;
        });

        if (dateOverride) {
            if (dateOverride.isUnavailable) {
                // Day is blocked
                return res.json({ slots: [] });
            }
            // Use override hours
            activeAvailabilities = [{
                startTime: dateOverride.startTime,
                endTime: dateOverride.endTime
            }];
        } else {
            // Use weekly availability
            activeAvailabilities = schedule.availabilities.filter(
                (a) => a.dayOfWeek === dayOfWeek
            );
        }

        if (activeAvailabilities.length === 0) {
            return res.json({ slots: [] });
        }

        // Generate all possible slots
        const allSlots = [];
        const bufferBefore = eventType.bufferBefore || 0;
        const bufferAfter = eventType.bufferAfter || 0;

        for (const availability of activeAvailabilities) {
            const [startHour, startMinute] = availability.startTime.split(':').map(Number);
            const [endHour, endMinute] = availability.endTime.split(':').map(Number);

            // Create start and end times for this availability window
            let currentTime = new Date(selectedDate);
            currentTime.setHours(startHour, startMinute, 0, 0);

            const endTime = new Date(selectedDate);
            endTime.setHours(endHour, endMinute, 0, 0);

            // Generate slots within this availability window
            while (currentTime < endTime) {
                const slotEnd = new Date(currentTime.getTime() + eventType.duration * 60000);

                // Calculate buffered start and end times
                const bufferedStart = new Date(currentTime.getTime() - bufferBefore * 60000);
                const bufferedEnd = new Date(slotEnd.getTime() + bufferAfter * 60000);

                // Only add slot if the entire buffered time fits within availability window
                if (bufferedEnd <= endTime && bufferedStart >= new Date(selectedDate).setHours(startHour, startMinute, 0, 0)) {
                    allSlots.push({
                        start: new Date(currentTime),
                        end: slotEnd,
                        bufferedStart,
                        bufferedEnd,
                    });
                }

                // Move to next slot
                currentTime = new Date(currentTime.getTime() + eventType.duration * 60000);
            }
        }

        // Fetch existing bookings for this date and event type
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await prisma.booking.findMany({
            where: {
                eventTypeId: eventType.id,
                status: 'CONFIRMED', // Only check confirmed bookings
                startTime: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        // Filter out booked slots (check buffered time for conflicts)
        const availableSlots = allSlots.filter(slot => {
            // Check if this slot's buffered time overlaps with any existing booking's buffered time
            return !existingBookings.some(booking => {
                const bookingStart = new Date(booking.startTime);
                const bookingEnd = new Date(booking.endTime);

                // Calculate buffered times for the existing booking
                const bookingBufferedStart = new Date(bookingStart.getTime() - bufferBefore * 60000);
                const bookingBufferedEnd = new Date(bookingEnd.getTime() + bufferAfter * 60000);

                // Check for overlap between buffered times
                return slot.bufferedStart < bookingBufferedEnd && slot.bufferedEnd > bookingBufferedStart;
            });
        });

        // Format slots for response
        const formattedSlots = availableSlots.map(slot => ({
            startTime: slot.start.toISOString(),
            endTime: slot.end.toISOString(),
            displayTime: slot.start.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            }),
        }));

        res.json({ slots: formattedSlots });
    } catch (error) {
        console.error('Error calculating slots:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/bookings
 * Create a new booking with strict double-booking prevention
 */
router.post('/bookings', async (req, res) => {
    try {
        const { eventTypeId, inviteeName, inviteeEmail, startTime, endTime, customAnswers } = req.body;

        if (!eventTypeId || !inviteeName || !inviteeEmail || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingBooking = await prisma.booking.findFirst({
            where: {
                eventTypeId: parseInt(eventTypeId),
                status: 'CONFIRMED',
                OR: [
                    {
                        AND: [
                            { startTime: { lte: new Date(startTime) } },
                            { endTime: { gt: new Date(startTime) } },
                        ],
                    },
                    {
                        AND: [
                            { startTime: { lt: new Date(endTime) } },
                            { endTime: { gte: new Date(endTime) } },
                        ],
                    },
                ],
            },
        });

        if (existingBooking) {
            return res.status(409).json({
                error: 'This time slot is no longer available',
                details: 'Another confirmed booking exists for this time'
            });
        }

        const booking = await prisma.booking.create({
            data: {
                eventTypeId: parseInt(eventTypeId),
                inviteeName,
                inviteeEmail,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                customAnswers: JSON.stringify(customAnswers || {}),
                status: 'CONFIRMED',
            },
            include: {
                eventType: true,
            },
        });

        const clientEmailHtml = getBookingConfirmationClient(booking);
        sendEmail({
            to: booking.inviteeEmail,
            subject: `Confirmed: ${booking.eventType.title} with You`,
            html: clientEmailHtml
        });

        const hostEmail = process.env.HOST_EMAIL || 'admin@example.com';
        const hostEmailHtml = getBookingNotificationHost(booking);
        sendEmail({
            to: hostEmail,
            subject: `New Booking: ${booking.inviteeName} - ${booking.eventType.title}`,
            html: hostEmailHtml
        });

        res.status(201).json(booking);
    } catch (error) {
        console.error('Error creating booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/meetings', async (req, res) => {
    try {
        const { type = 'upcoming' } = req.query;
        const now = new Date();

        let whereClause = {};

        if (type === 'upcoming') {
            whereClause = {
                startTime: { gte: now },
                status: 'CONFIRMED',
            };
        } else if (type === 'past') {
            whereClause = {
                OR: [
                    { startTime: { lt: now } },
                    { status: 'CANCELLED' },
                ],
            };
        }

        const meetings = await prisma.booking.findMany({
            where: whereClause,
            include: {
                eventType: {
                    select: {
                        id: true,
                        title: true,
                        duration: true,
                        color: true,
                    },
                },
            },
            orderBy: {
                startTime: type === 'upcoming' ? 'asc' : 'desc',
            },
        });

        res.json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/meetings/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status === 'CANCELLED') {
            return res.status(400).json({ error: 'Booking is already cancelled' });
        }

        const updatedBooking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { status: 'CANCELLED' },
            include: { eventType: true }
        });

        const cancelHtml = getCancellationNotice(updatedBooking);
        sendEmail({
            to: updatedBooking.inviteeEmail,
            subject: `Cancelled: ${updatedBooking.eventType.title}`,
            html: cancelHtml
        });

        const hostEmail = process.env.HOST_EMAIL || 'admin@example.com';
        sendEmail({
            to: hostEmail,
            subject: `Cancelled: ${updatedBooking.eventType.title} with ${updatedBooking.inviteeName}`,
            html: cancelHtml
        });

        res.json(updatedBooking);
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/bookings/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: {
                eventType: true,
            },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        res.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.patch('/bookings/:id/reschedule', async (req, res) => {
    try {
        const { id } = req.params;
        const { startTime, endTime } = req.body;

        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'startTime and endTime are required' });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: parseInt(id) },
            include: { eventType: true },
        });

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (booking.status !== 'CONFIRMED') {
            return res.status(400).json({ error: 'Can only reschedule confirmed bookings' });
        }

        // Get buffer times
        const bufferBefore = booking.eventType.bufferBefore || 0;
        const bufferAfter = booking.eventType.bufferAfter || 0;

        // Check if new time slot is available (exclude current booking)
        const newStartTime = new Date(startTime);
        const newEndTime = new Date(endTime);
        const bufferedStart = new Date(newStartTime.getTime() - bufferBefore * 60000);
        const bufferedEnd = new Date(newEndTime.getTime() + bufferAfter * 60000);

        const conflictingBooking = await prisma.booking.findFirst({
            where: {
                eventTypeId: booking.eventTypeId,
                status: 'CONFIRMED',
                id: { not: parseInt(id) },
                OR: [
                    { AND: [{ startTime: { lte: bufferedStart } }, { endTime: { gt: bufferedStart } }] },
                    { AND: [{ startTime: { lt: bufferedEnd } }, { endTime: { gte: bufferedEnd } }] },
                    { AND: [{ startTime: { gte: bufferedStart } }, { endTime: { lte: bufferedEnd } }] },
                ],
            },
        });

        if (conflictingBooking) {
            return res.status(409).json({ error: 'Selected time slot is not available' });
        }

        // Update booking
        const updatedBooking = await prisma.booking.update({
            where: { id: parseInt(id) },
            data: { startTime: newStartTime, endTime: newEndTime },
            include: { eventType: true },
        });

        res.json(updatedBooking);
    } catch (error) {
        console.error('Error rescheduling booking:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/event-types', async (req, res) => {
    try {
        const eventTypes = await prisma.eventType.findMany({
            where: { userId: 1 },
            orderBy: { createdAt: 'desc' },
        });

        res.json(eventTypes);
    } catch (error) {
        console.error('Error fetching event types:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/event-types', async (req, res) => {
    try {
        const { title, duration, urlSlug, description, color, scheduleId, bufferBefore, bufferAfter, customQuestions } = req.body;

        if (!title || !duration || !urlSlug) {
            return res.status(400).json({ error: 'Missing required fields: title, duration, urlSlug' });
        }

        const existing = await prisma.eventType.findUnique({
            where: { urlSlug },
        });

        if (existing) {
            return res.status(409).json({ error: 'URL slug already exists' });
        }

        const eventType = await prisma.$transaction(async (prisma) => {
            const et = await prisma.eventType.create({
                data: {
                    title,
                    duration: parseInt(duration),
                    urlSlug,
                    description: description || null,
                    color: color || '#006BFF',
                    userId: 1,
                    scheduleId: scheduleId || null,
                    bufferBefore: parseInt(bufferBefore || 0),
                    bufferAfter: parseInt(bufferAfter || 0),
                },
            });

            if (customQuestions && customQuestions.length > 0) {
                await prisma.customQuestion.createMany({
                    data: customQuestions.map((q, index) => ({
                        eventTypeId: et.id,
                        label: q.label,
                        type: q.type,
                        required: q.required,
                        options: q.options ? JSON.stringify(q.options) : null,
                        placeholder: q.placeholder,
                        position: index,
                    }))
                });
            }

            return et;
        });

        res.status(201).json(eventType);
    } catch (error) {
        console.error('Error creating event type:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/event-types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            duration,
            urlSlug,
            description,
            color,
            scheduleId,
            bufferBefore,
            bufferAfter,
            customQuestions
        } = req.body;

        // Check if event type exists
        const eventType = await prisma.eventType.findUnique({
            where: { id: parseInt(id) },
        });

        if (!eventType) {
            return res.status(404).json({ error: 'Event type not found' });
        }

        if (urlSlug && urlSlug !== eventType.urlSlug) {
            const existing = await prisma.eventType.findUnique({
                where: { urlSlug },
            });

            if (existing) {
                return res.status(409).json({ error: 'URL slug already exists' });
            }
        }

        const updatedEventType = await prisma.$transaction(async (prisma) => {
            const et = await prisma.eventType.update({
                where: { id: parseInt(id) },
                data: {
                    ...(title && { title }),
                    ...(duration && { duration: parseInt(duration) }),
                    ...(urlSlug && { urlSlug }),
                    ...(description !== undefined && { description }),
                    ...(color && { color }),
                    ...(scheduleId !== undefined && { scheduleId: scheduleId || null }),
                    ...(bufferBefore !== undefined && { bufferBefore: parseInt(bufferBefore) }),
                    ...(bufferAfter !== undefined && { bufferAfter: parseInt(bufferAfter) }),
                },
            });

            if (customQuestions) {
                await prisma.customQuestion.deleteMany({
                    where: { eventTypeId: parseInt(id) }
                });

                if (customQuestions.length > 0) {
                    await prisma.customQuestion.createMany({
                        data: customQuestions.map((q, index) => ({
                            eventTypeId: parseInt(id),
                            label: q.label,
                            type: q.type,
                            required: q.required,
                            options: q.options ? JSON.stringify(q.options) : null,
                            placeholder: q.placeholder,
                            position: index,
                        }))
                    });
                }
            }

            return et;
        });

        res.json(updatedEventType);
    } catch (error) {
        console.error('Error updating event type:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/event-types/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if event type exists
        const eventType = await prisma.eventType.findUnique({
            where: { id: parseInt(id) },
        });

        if (!eventType) {
            return res.status(404).json({ error: 'Event type not found' });
        }

        await prisma.eventType.delete({
            where: { id: parseInt(id) },
        });

        res.json({ message: 'Event type deleted successfully' });
    } catch (error) {
        console.error('Error deleting event type:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/availability', async (req, res) => {
    try {
        const userId = 1;

        // Find default schedule
        let schedule = await prisma.availabilitySchedule.findFirst({
            where: { userId, isDefault: true },
            include: { availabilities: true }
        });

        if (!schedule) {
            schedule = await prisma.availabilitySchedule.create({
                data: {
                    name: "Default Schedule",
                    userId,
                    isDefault: true,
                    availabilities: {
                        create: [
                            { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 4, startTime: '09:00', endTime: '17:00' },
                            { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
                        ]
                    }
                },
                include: { availabilities: true }
            });
        }

        // Get user timezone
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { timeZone: true },
        });

        res.json({
            availabilities: schedule.availabilities.sort((a, b) => a.dayOfWeek - b.dayOfWeek),
            timeZone: user?.timeZone || 'UTC',
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PUT /api/availability
 * Update user's availability settings
 * Body: {
 *   availabilities: [{ dayOfWeek, startTime, endTime }],
 *   timeZone: string
 * }
 */
router.put('/availability', async (req, res) => {
    try {
        const userId = 1; // Hardcoded admin user
        const { availabilities, timeZone } = req.body;

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
            // Validate time format (HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(avail.startTime) || !timeRegex.test(avail.endTime)) {
                return res.status(400).json({ error: 'Invalid time format (use HH:MM)' });
            }
        }

        // Find default schedule
        let schedule = await prisma.availabilitySchedule.findFirst({
            where: { userId, isDefault: true }
        });

        if (!schedule) {
            return res.status(404).json({ error: 'Default schedule not found' });
        }

        // Delete existing availabilities for this schedule
        await prisma.availability.deleteMany({
            where: { scheduleId: schedule.id },
        });

        // Create new availabilities
        await prisma.availability.createMany({
            data: availabilities.map((avail) => ({
                dayOfWeek: avail.dayOfWeek,
                startTime: avail.startTime,
                endTime: avail.endTime,
                scheduleId: schedule.id,
            })),
        });

        // Update timezone if provided
        if (timeZone) {
            await prisma.user.update({
                where: { id: userId },
                data: { timeZone },
            });
        }

        // Fetch updated availabilities
        const updatedAvailabilities = await prisma.availability.findMany({
            where: { scheduleId: schedule.id },
            orderBy: { dayOfWeek: 'asc' },
        });

        res.json({
            message: 'Availability updated successfully',
            availabilities: updatedAvailabilities,
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/schedules/:id/overrides
 * Get overrides for a schedule
 */
router.get('/schedules/:id/overrides', async (req, res) => {
    try {
        const { id } = req.params;
        const overrides = await prisma.dateOverride.findMany({
            where: { scheduleId: parseInt(id) },
            orderBy: { date: 'asc' },
        });
        res.json(overrides);
    } catch (error) {
        console.error('Error fetching overrides:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/schedules/:id/overrides
 * Create or update an override
 */
router.post('/schedules/:id/overrides', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, startTime, endTime, isUnavailable } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        const override = await prisma.dateOverride.upsert({
            where: {
                scheduleId_date: {
                    scheduleId: parseInt(id),
                    date: new Date(date),
                },
            },
            update: {
                startTime: startTime || '09:00',
                endTime: endTime || '17:00',
                isUnavailable: isUnavailable || false,
            },
            create: {
                scheduleId: parseInt(id),
                date: new Date(date),
                startTime: startTime || '09:00',
                endTime: endTime || '17:00',
                isUnavailable: isUnavailable || false,
            },
        });

        res.json(override);
    } catch (error) {
        console.error('Error saving override:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/schedules/:id/overrides/:date
 * Delete an override
 */
router.delete('/schedules/:id/overrides/:date', async (req, res) => {
    try {
        const { id, date } = req.params;

        await prisma.dateOverride.deleteMany({
            where: {
                scheduleId: parseInt(id),
                date: new Date(date),
            },
        });

        res.json({ message: 'Override deleted' });
    } catch (error) {
        console.error('Error deleting override:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
