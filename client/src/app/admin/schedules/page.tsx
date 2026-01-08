'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Availability = {
    id: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

type Schedule = {
    id: number;
    name: string;
    isDefault: boolean;
    availabilities: Availability[];
    _count: {
        eventTypes: number;
    };
};

const DAYS_OF_WEEK = [
    { label: 'Sunday', value: 0 },
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
];

export default function SchedulesPage() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        isDefault: false,
        availabilities: [] as { dayOfWeek: number; startTime: string; endTime: string }[],
    });
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        fetchSchedules();
    }, []);

    const fetchSchedules = async () => {
        try {
            const response = await fetch(`${API_URL}/api/availability-schedules`);
            if (response.ok) {
                const data = await response.json();
                setSchedules(data);
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingSchedule(null);
        setFormData({
            name: '',
            isDefault: false,
            availabilities: [],
        });
        setSelectedDays(new Set([1, 2, 3, 4, 5])); // Default: Mon-Fri
        setShowModal(true);
    };

    const handleEdit = (schedule: Schedule) => {
        setEditingSchedule(schedule);
        setFormData({
            name: schedule.name,
            isDefault: schedule.isDefault,
            availabilities: schedule.availabilities,
        });
        const days = new Set(schedule.availabilities.map((a) => a.dayOfWeek));
        setSelectedDays(days);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Build availabilities from selected days
        const availabilities = Array.from(selectedDays).map((day) => {
            const existing = formData.availabilities.find((a) => a.dayOfWeek === day);
            return {
                dayOfWeek: day,
                startTime: existing?.startTime || '09:00',
                endTime: existing?.endTime || '17:00',
            };
        });

        const payload = {
            name: formData.name,
            isDefault: formData.isDefault,
            availabilities,
        };

        try {
            const url = editingSchedule
                ? `${API_URL}/api/availability-schedules/${editingSchedule.id}`
                : `${API_URL}/api/availability-schedules`;

            const method = editingSchedule ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setShowModal(false);
                fetchSchedules();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save schedule');
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this schedule?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/availability-schedules/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchSchedules();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete schedule');
            }
        } catch (error) {
            console.error('Error deleting schedule:', error);
            alert('Failed to delete schedule');
        }
    };

    const handleSetDefault = async (id: number) => {
        try {
            const response = await fetch(`${API_URL}/api/availability-schedules/${id}/set-default`, {
                method: 'PATCH',
            });

            if (response.ok) {
                fetchSchedules();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to set default schedule');
            }
        } catch (error) {
            console.error('Error setting default:', error);
            alert('Failed to set default schedule');
        }
    };

    const toggleDay = (day: number) => {
        const newDays = new Set(selectedDays);
        if (newDays.has(day)) {
            newDays.delete(day);
        } else {
            newDays.add(day);
        }
        setSelectedDays(newDays);
    };

    const updateTimeForDay = (day: number, field: 'startTime' | 'endTime', value: string) => {
        const newAvailabilities = [...formData.availabilities];
        const index = newAvailabilities.findIndex((a) => a.dayOfWeek === day);

        if (index >= 0) {
            newAvailabilities[index] = { ...newAvailabilities[index], [field]: value };
        } else {
            newAvailabilities.push({
                dayOfWeek: day,
                startTime: field === 'startTime' ? value : '09:00',
                endTime: field === 'endTime' ? value : '17:00',
            });
        }

        setFormData({ ...formData, availabilities: newAvailabilities });
    };

    const getAvailabilityForDay = (day: number) => {
        return formData.availabilities.find((a) => a.dayOfWeek === day) || {
            startTime: '09:00',
            endTime: '17:00',
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-xl text-gray-600">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Availability Schedules</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Create multiple schedules and assign them to event types
                            </p>
                        </div>
                        <Link
                            href="/admin"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <button
                        onClick={handleCreate}
                        className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Schedule
                    </button>
                </div>

                {schedules.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No schedules yet. Create one to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {schedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-xl font-bold text-gray-900">
                                                    {schedule.name}
                                                </h3>
                                                {schedule.isDefault && (
                                                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {schedule._count.eventTypes} event type(s) using this
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(schedule)}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(schedule.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        {schedule.availabilities.map((avail) => (
                                            <div key={avail.id} className="text-sm text-gray-600">
                                                <span className="font-medium">
                                                    {DAYS_OF_WEEK[avail.dayOfWeek].label}:
                                                </span>{' '}
                                                {avail.startTime} - {avail.endTime}
                                            </div>
                                        ))}
                                    </div>

                                    {!schedule.isDefault && (
                                        <button
                                            onClick={() => handleSetDefault(schedule.id)}
                                            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                                        >
                                            Set as Default
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 my-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">
                            {editingSchedule ? 'Edit Schedule' : 'Create Schedule'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Schedule Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="Work Hours"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.isDefault}
                                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Set as default schedule</span>
                                </label>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Available Days & Times
                                </label>
                                <div className="space-y-3">
                                    {DAYS_OF_WEEK.map((day) => (
                                        <div key={day.value} className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 w-32">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedDays.has(day.value)}
                                                    onChange={() => toggleDay(day.value)}
                                                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                                                />
                                                <span className="text-sm font-medium text-gray-700">{day.label}</span>
                                            </label>
                                            {selectedDays.has(day.value) && (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <input
                                                        type="time"
                                                        value={getAvailabilityForDay(day.value).startTime}
                                                        onChange={(e) => updateTimeForDay(day.value, 'startTime', e.target.value)}
                                                        className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                                    />
                                                    <span className="text-gray-500">to</span>
                                                    <input
                                                        type="time"
                                                        value={getAvailabilityForDay(day.value).endTime}
                                                        onChange={(e) => updateTimeForDay(day.value, 'endTime', e.target.value)}
                                                        className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors"
                                >
                                    {editingSchedule ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
