'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/config';

type Meeting = {
    id: number;
    inviteeName: string;
    inviteeEmail: string;
    startTime: string;
    endTime: string;
    status: 'CONFIRMED' | 'CANCELLED';
    eventType: {
        id: number;
        title: string;
        duration: number;
        color: string;
        urlSlug: string;
    };
};

export default function MeetingsPage() {
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);

    const API_URL = getApiUrl();

    useEffect(() => {
        fetchMeetings();
    }, [activeTab]);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/meetings?type=${activeTab}`);
            if (response.ok) {
                const data = await response.json();
                setMeetings(data);
            }
        } catch (error) {
            console.error('Error fetching meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id: number) => {
        if (!window.confirm('Are you sure you want to cancel this meeting?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/meetings/${id}/cancel`, {
                method: 'PATCH',
            });

            if (response.ok) {
                fetchMeetings();
            } else {
                const error = await response.json() as { error: string };
                window.alert(error.error || 'Failed to cancel meeting');
            }
        } catch (error) {
            console.error('Error cancelling meeting:', error);
            window.alert('Failed to cancel meeting');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Meetings</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage your scheduled meetings
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

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-8">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'upcoming'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Upcoming
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`py-4 px-2 border-b-2 font-medium transition-colors ${activeTab === 'past'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Past
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="text-xl text-gray-600">Loading...</div>
                    </div>
                ) : meetings.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                        </svg>
                        <p className="mt-4 text-gray-500">
                            No {activeTab} meetings found
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {meetings.map((meeting) => (
                            <div
                                key={meeting.id}
                                className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                            >
                                <div className="flex">
                                    {/* Color Bar */}
                                    <div
                                        className="w-1.5"
                                        style={{ backgroundColor: meeting.eventType.color }}
                                    />

                                    {/* Content */}
                                    <div className="flex-1 p-6">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            {/* Meeting Info */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900">
                                                        {meeting.eventType.title}
                                                    </h3>
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded-full ${meeting.status === 'CONFIRMED'
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                            }`}
                                                    >
                                                        {meeting.status}
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                            />
                                                        </svg>
                                                        <span className="font-medium">
                                                            {meeting.inviteeName}
                                                        </span>
                                                        <span className="text-gray-400">•</span>
                                                        <span>{meeting.inviteeEmail}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        <span>{formatDate(meeting.startTime)}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <svg
                                                            className="w-4 h-4"
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
                                                        <span>
                                                            {formatTime(meeting.startTime)} -{' '}
                                                            {formatTime(meeting.endTime)}
                                                        </span>
                                                        <span className="text-gray-400">•</span>
                                                        <span>{meeting.eventType.duration} minutes</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {activeTab === 'upcoming' && meeting.status === 'CONFIRMED' && (
                                                <div className="flex gap-2">
                                                    <Link
                                                        href={`/admin/${meeting.eventType.urlSlug}?reschedule=${meeting.id}`}
                                                        className="px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium flex items-center gap-2"
                                                    >
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        Reschedule
                                                    </Link>
                                                    <button
                                                        onClick={() => handleCancel(meeting.id)}
                                                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center gap-2"
                                                    >
                                                        <svg
                                                            className="w-4 h-4"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M6 18L18 6M6 6l12 12"
                                                            />
                                                        </svg>
                                                        Cancel Meeting
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
