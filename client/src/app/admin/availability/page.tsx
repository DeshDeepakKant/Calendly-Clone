'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/config';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

type Availability = {
    id?: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

type DateOverride = {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    isUnavailable: boolean;
};

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
];

export default function AvailabilityPage() {
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [timeZone, setTimeZone] = useState('UTC');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [overrides, setOverrides] = useState<DateOverride[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [overrideForm, setOverrideForm] = useState({
        startTime: '09:00',
        endTime: '17:00',
        isUnavailable: false,
    });

    const API_URL = getApiUrl();

    useEffect(() => {
        fetchAvailability();
        // Assuming we are overriding the default schedule (id=1 for now, or find default)
        // Ideally we fetch the schedule first. For this MVP we will fetch overrides for schedule 1
        fetchOverrides(1);
    }, []);

    const fetchAvailability = async () => {
        try {
            const response = await fetch(`${API_URL}/api/availability`);
            if (response.ok) {
                const data = await response.json() as { availabilities: Availability[], timeZone: string };
                setAvailabilities(data.availabilities || []);
                setTimeZone(data.timeZone || 'UTC');

                // Set selected days based on existing availabilities
                const days = new Set<number>(data.availabilities.map((a: Availability) => a.dayOfWeek));
                setSelectedDays(days);
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOverrides = async (scheduleId: number) => {
        try {
            const response = await fetch(`${API_URL}/api/schedules/${scheduleId}/overrides`);
            if (response.ok) {
                const data = await response.json() as DateOverride[];
                setOverrides(data);
            }
        } catch (error) {
            console.error('Error fetching overrides:', error);
        }
    };

    const handleSaveOverride = async () => {
        if (!selectedDate) return;

        try {
            // Normalize date to UTC midnight to avoid timezone shifts
            const utcDate = new Date(Date.UTC(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
            ));

            const response = await fetch(`${API_URL}/api/schedules/1/overrides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: utcDate.toISOString(),
                    startTime: overrideForm.startTime,
                    endTime: overrideForm.endTime,
                    isUnavailable: overrideForm.isUnavailable,
                }),
            });

            if (response.ok) {
                fetchOverrides(1);
                setSelectedDate(null);
                setOverrideForm({ startTime: '09:00', endTime: '17:00', isUnavailable: false });
            } else {
                const error = await response.json() as { error: string };
                window.alert(error.error || 'Failed to save override');
            }
        } catch (error) {
            console.error('Error saving override:', error);
            window.alert('Failed to save override');
        }
    };

    const handleDeleteOverride = async (date: string) => {
        try {
            const response = await fetch(`${API_URL}/api/schedules/1/overrides/${date}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchOverrides(1);
            }
        } catch (error) {
            console.error('Error deleting override:', error);
        }
    };

    const toggleDay = (dayOfWeek: number) => {
        const newSelectedDays = new Set(selectedDays);

        if (newSelectedDays.has(dayOfWeek)) {
            newSelectedDays.delete(dayOfWeek);
            // Remove availability for this day
            setAvailabilities(availabilities.filter(a => a.dayOfWeek !== dayOfWeek));
        } else {
            newSelectedDays.add(dayOfWeek);
            // Add default availability for this day
            setAvailabilities([
                ...availabilities,
                { dayOfWeek, startTime: '09:00', endTime: '17:00' },
            ]);
        }

        setSelectedDays(newSelectedDays);
    };

    const updateTimeForDay = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
        setAvailabilities(
            availabilities.map(a =>
                a.dayOfWeek === dayOfWeek ? { ...a, [field]: value } : a
            )
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/api/availability`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    availabilities: availabilities.map(({ dayOfWeek, startTime, endTime }) => ({
                        dayOfWeek,
                        startTime,
                        endTime,
                    })),
                    timeZone,
                }),
            });

            if (response.ok) {
                window.alert('Availability updated successfully!');
                fetchAvailability();
            } else {
                const error = await response.json() as { error: string };
                window.alert(error.error || 'Failed to update availability');
            }
        } catch (error) {
            console.error('Error updating availability:', error);
            window.alert('Failed to update availability');
        } finally {
            setSaving(false);
        }
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
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Availability</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Set your available hours for meetings
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
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    {/* Timezone Selection */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Timezone
                        </label>
                        <select
                            value={timeZone}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTimeZone(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            {TIMEZONES.map((tz) => (
                                <option key={tz} value={tz}>
                                    {tz}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Days Selection */}
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Available Days
                        </h3>
                        <div className="space-y-4">
                            {DAYS_OF_WEEK.map((day) => {
                                const isSelected = selectedDays.has(day.value);
                                const availability = availabilities.find(a => a.dayOfWeek === day.value);

                                return (
                                    <div
                                        key={day.value}
                                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                                    >
                                        {/* Day Checkbox */}
                                        <div className="flex items-center min-w-[140px]">
                                            <input
                                                type="checkbox"
                                                id={`day-${day.value}`}
                                                checked={isSelected}
                                                onChange={() => toggleDay(day.value)}
                                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                            />
                                            <label
                                                htmlFor={`day-${day.value}`}
                                                className="ml-3 text-sm font-medium text-gray-700 cursor-pointer"
                                            >
                                                {day.label}
                                            </label>
                                        </div>

                                        {/* Time Inputs */}
                                        {isSelected && availability && (
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={availability.startTime}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            updateTimeForDay(day.value, 'startTime', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    />
                                                    <span className="text-gray-500">to</span>
                                                    <input
                                                        type="time"
                                                        value={availability.endTime}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                            updateTimeForDay(day.value, 'endTime', e.target.value)
                                                        }
                                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {!isSelected && (
                                            <div className="flex-1 text-sm text-gray-400">
                                                Unavailable
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Date Overrides Section */}
                    <div className="mb-8 pt-8 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Date-Specific Overrides
                        </h3>
                        {/* Ensure Calendar is client-side only if needed, or structured correctly */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <Calendar
                                    onChange={(value) => setSelectedDate(value as Date)}
                                    value={selectedDate}
                                    className="w-full border border-gray-200 rounded-lg p-4"
                                    tileContent={({ date }) => {
                                        const tileDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                        const override = overrides.find(o =>
                                            new Date(o.date).toISOString().split('T')[0] === tileDateStr
                                        );
                                        return override ? (
                                            <div className="text-xs text-center mt-1">
                                                {override.isUnavailable ? (
                                                    <span className="text-red-500 font-bold">•</span>
                                                ) : (
                                                    <span className="text-green-500 font-bold">•</span>
                                                )}
                                            </div>
                                        ) : null;
                                    }}
                                />
                            </div>

                            <div className="bg-gray-50 rounded-lg p-6">
                                {selectedDate ? (
                                    <>
                                        <h4 className="font-medium text-gray-900 mb-4">
                                            Edit Availability for {selectedDate.toLocaleDateString()}
                                        </h4>
                                        <div className="mb-4">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={overrideForm.isUnavailable}
                                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setOverrideForm({ ...overrideForm, isUnavailable: e.target.checked })}
                                                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">Mark as unavailable</span>
                                            </label>
                                        </div>

                                        {!overrideForm.isUnavailable && (
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={overrideForm.startTime}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setOverrideForm({ ...overrideForm, startTime: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={overrideForm.endTime}
                                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setOverrideForm({ ...overrideForm, endTime: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedDate(null)}
                                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveOverride}
                                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                                            >
                                                Save Override
                                            </button>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={() => {
                                                    const existing = overrides.find(o =>
                                                        new Date(o.date).toDateString() === selectedDate.toDateString()
                                                    );
                                                    if (existing) handleDeleteOverride(existing.date);
                                                }}
                                                className="text-red-600 text-sm hover:underline"
                                            >
                                                Remove override for this date
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                        <p>Select a date to set specific hours</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-8">
                        <Link
                            href="/admin"
                            className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            onClick={handleSave}
                            disabled={saving || selectedDays.size === 0}
                            className="px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Availability'}
                        </button>
                    </div>

                    {/* Helper Text */}
                    {selectedDays.size === 0 && (
                        <p className="mt-4 text-sm text-gray-500 text-center">
                            Select at least one day to set your availability
                        </p>
                    )}
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                        <svg
                            className="w-5 h-5 text-blue-600 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                                About Availability
                            </h3>
                            <p className="mt-1 text-sm text-blue-700">
                                Your availability settings determine when people can book meetings with you.
                                Time slots outside these hours won't be shown on your booking pages.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
