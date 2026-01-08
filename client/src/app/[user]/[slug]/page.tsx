'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useSearchParams } from 'next/navigation';

type EventType = {
    id: number;
    title: string;
    duration: number;
    description: string | null;
    user: {
        username: string;
        timeZone: string;
    };
    customQuestions?: CustomQuestion[];
};

type CustomQuestion = {
    id: number;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'phone';
    required: boolean;
    options: string | null; // JSON string from DB
    placeholder?: string;
};

type TimeSlot = {
    startTime: string;
    endTime: string;
    displayTime: string;
};

export default function BookingPage({
    params,
}: {
    params: { user: string; slug: string };
}) {
    const searchParams = useSearchParams();
    const rescheduleId = searchParams.get('reschedule');
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [originalBooking, setOriginalBooking] = useState<any>(null);

    const [eventType, setEventType] = useState<EventType | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        customAnswers: {} as Record<string, string>,
    });
    const [bookingSuccess, setBookingSuccess] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    // Check for reschedule mode
    useEffect(() => {
        if (rescheduleId) {
            setIsRescheduling(true);
            fetchOriginalBooking(rescheduleId);
        }
    }, [rescheduleId]);

    const fetchOriginalBooking = async (id: string) => {
        try {
            const response = await fetch(`${API_URL}/api/bookings/${id}`);
            if (response.ok) {
                const data = await response.json();
                setOriginalBooking(data);
                setFormData({
                    name: data.inviteeName,
                    email: data.inviteeEmail,
                    customAnswers: {},
                });
            }
        } catch (error) {
            console.error('Error fetching original booking:', error);
        }
    };

    // Fetch event type details
    useEffect(() => {
        async function fetchEventType() {
            try {
                const response = await fetch(`${API_URL}/api/event-types/${params.slug}`);
                if (response.ok) {
                    const data = await response.json();
                    setEventType(data);
                } else {
                    console.error('Event type not found');
                }
            } catch (error) {
                console.error('Error fetching event type:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchEventType();
    }, [params.slug, API_URL]);

    // Fetch available slots when date is selected
    useEffect(() => {
        if (!selectedDate || !eventType) return;

        async function fetchSlots() {
            setLoadingSlots(true);
            try {
                const dateStr = selectedDate.toISOString().split('T')[0];
                const response = await fetch(
                    `${API_URL}/api/slots?date=${dateStr}&slug=${params.slug}`
                );

                if (response.ok) {
                    const data = await response.json();
                    setAvailableSlots(data.slots || []);
                }
            } catch (error) {
                console.error('Error fetching slots:', error);
            } finally {
                setLoadingSlots(false);
            }
        }

        fetchSlots();
    }, [selectedDate, eventType, params.slug, API_URL]);

    const handleDateChange = (value: Date | null) => {
        setSelectedDate(value);
        setSelectedSlot(null);
    };

    const handleSlotClick = (slot: TimeSlot) => {
        setSelectedSlot(slot);
        setShowModal(true);
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedSlot || !eventType) return;

        try {
            let response;

            if (isRescheduling && rescheduleId) {
                // Reschedule existing booking
                response = await fetch(`${API_URL}/api/bookings/${rescheduleId}/reschedule`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        startTime: selectedSlot.startTime,
                        endTime: selectedSlot.endTime,
                    }),
                });
            } else {
                // Create new booking
                response = await fetch(`${API_URL}/api/bookings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        eventTypeId: eventType.id,
                        inviteeName: formData.name,
                        inviteeEmail: formData.email,
                        startTime: selectedSlot.startTime,
                        endTime: selectedSlot.endTime,
                        customAnswers: formData.customAnswers,
                    }),
                });
            }

            if (response.ok) {
                setBookingSuccess(true);
                setFormData({ name: '', email: '', customAnswers: {} });

                // Refresh slots
                if (selectedDate) {
                    const dateStr = selectedDate.toISOString().split('T')[0];
                    const slotsResponse = await fetch(
                        `${API_URL}/api/slots?date=${dateStr}&slug=${params.slug}`
                    );
                    if (slotsResponse.ok) {
                        const data = await slotsResponse.json();
                        setAvailableSlots(data.slots || []);
                    }
                }

                setTimeout(() => {
                    setShowModal(false);
                    setBookingSuccess(false);
                    setSelectedSlot(null);
                }, 2000);
            } else {
                const error = await response.json() as { error: string };
                window.alert(error.error || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Error creating booking:', error);
            window.alert('Failed to create booking');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    if (!eventType) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-gray-600">Event type not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 md:py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {/* Left Column - Event Details */}
                        <div className="p-6 md:p-12 bg-gradient-to-br from-primary-600 to-primary-800 text-white order-1 md:order-1">
                            <div className="mb-6">
                                <p className="text-primary-200 text-sm font-medium mb-2">
                                    {eventType.user.username}
                                </p>
                                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                                    {isRescheduling ? `Rescheduling: ${eventType.title}` : eventType.title}
                                </h1>
                                <div className="flex items-center gap-2 text-primary-100">
                                    <svg
                                        className="w-5 h-5"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <span className="font-medium">{eventType.duration} minutes</span>
                                </div>
                            </div>

                            {eventType.description && (
                                <div className="mb-8">
                                    <h2 className="text-lg font-semibold mb-2">Description</h2>
                                    <p className="text-primary-100 leading-relaxed">
                                        {eventType.description}
                                    </p>
                                </div>
                            )}

                            <div className="pt-6 border-t border-primary-500">
                                <p className="text-sm text-primary-200">
                                    Timezone: {eventType.user.timeZone}
                                </p>
                            </div>
                        </div>

                        {/* Right Column - Calendar & Slots */}
                        <div className="p-8 md:p-12">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6">
                                Select a Date & Time
                            </h2>

                            {/* Calendar */}
                            <div className="mb-8">
                                <Calendar
                                    onChange={(value) => handleDateChange(value as Date)}
                                    value={selectedDate}
                                    minDate={new Date()}
                                    className="w-full"
                                />
                            </div>

                            {/* Time Slots */}
                            {selectedDate && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                        {selectedDate.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </h3>

                                    {loadingSlots ? (
                                        <div className="text-center py-8 text-gray-500">
                                            Loading available times...
                                        </div>
                                    ) : availableSlots.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            No available times for this date
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                            {availableSlots.map((slot, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleSlotClick(slot)}
                                                    className="px-4 py-3 border-2 border-primary-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all font-medium text-primary-700 hover:text-primary-900"
                                                >
                                                    {slot.displayTime}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking Modal */}
            {showModal && selectedSlot && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        {bookingSuccess ? (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg
                                        className="w-8 h-8 text-green-600"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                    Booking Confirmed!
                                </h3>
                                <p className="text-gray-600">
                                    {isRescheduling
                                        ? 'Your meeting has been rescheduled successfully.'
                                        : "You'll receive a confirmation email shortly."
                                    }
                                </p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-800 mb-6">
                                    Confirm Your Booking
                                </h3>

                                <div className="mb-6 p-4 bg-primary-50 rounded-lg">
                                    <p className="text-sm text-gray-600 mb-1">
                                        {selectedDate?.toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                    <p className="text-lg font-semibold text-primary-700">
                                        {selectedSlot.displayTime}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {eventType.duration} minutes
                                    </p>
                                </div>

                                <form onSubmit={handleBooking}>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            disabled={isRescheduling}
                                            value={formData.name}
                                            onChange={(e) =>
                                                setFormData({ ...formData, name: e.target.value })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Your Email *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            disabled={isRescheduling}
                                            value={formData.email}
                                            onChange={(e) =>
                                                setFormData({ ...formData, email: e.target.value })
                                            }
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                            placeholder="john@example.com"
                                        />
                                    </div>

                                    {/* Custom Questions */}
                                    {eventType?.customQuestions?.map((question) => (
                                        <div key={question.id} className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {question.label} {question.required && '*'}
                                            </label>

                                            {question.type === 'textarea' ? (
                                                <textarea
                                                    required={question.required}
                                                    value={formData.customAnswers[question.id] || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        customAnswers: {
                                                            ...formData.customAnswers,
                                                            [question.id]: e.target.value
                                                        }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    placeholder={question.placeholder}
                                                    rows={3}
                                                />
                                            ) : question.type === 'select' ? (
                                                <select
                                                    required={question.required}
                                                    value={formData.customAnswers[question.id] || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        customAnswers: {
                                                            ...formData.customAnswers,
                                                            [question.id]: e.target.value
                                                        }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                >
                                                    <option value="">Select an option</option>
                                                    {question.options && JSON.parse(question.options as string).map((opt: string, idx: number) => (
                                                        <option key={idx} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input
                                                    type={question.type === 'phone' ? 'tel' : 'text'}
                                                    required={question.required}
                                                    value={formData.customAnswers[question.id] || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        customAnswers: {
                                                            ...formData.customAnswers,
                                                            [question.id]: e.target.value
                                                        }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    placeholder={question.placeholder}
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowModal(false);
                                                setSelectedSlot(null);
                                            }}
                                            className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                                        >
                                            {isRescheduling ? 'Confirm Reschedule' : 'Confirm Booking'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
