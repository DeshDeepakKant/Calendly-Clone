'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type EventType = {
    id: number;
    title: string;
    duration: number;
    urlSlug: string;
    description: string | null;
    color: string;
    scheduleId?: number | null;
    bufferBefore?: number;
    bufferAfter?: number;
    customQuestions?: CustomQuestion[];
};

type CustomQuestion = {
    id?: number;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'phone';
    required: boolean;
    options?: string[]; // stored as string[] in frontend, JSON string in DB
    placeholder?: string;
};

type Schedule = {
    id: number;
    name: string;
    isDefault: boolean;
};

export default function AdminDashboard() {
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        duration: 30,
        urlSlug: '',
        description: '',
        color: '#006BFF',
        scheduleId: null as number | null,
        bufferBefore: 0,
        bufferAfter: 0,
        customQuestions: [] as CustomQuestion[],
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        fetchEventTypes();
        fetchSchedules();
    }, []);

    const fetchEventTypes = async () => {
        try {
            const response = await fetch(`${API_URL}/api/event-types`);
            if (response.ok) {
                const data = await response.json();
                setEventTypes(data);
            }
        } catch (error) {
            console.error('Error fetching event types:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const response = await fetch(`${API_URL}/api/availability-schedules`);
            if (response.ok) {
                const data = await response.json();
                setSchedules(data);
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
        }
    };

    const handleEdit = (eventType: EventType) => {
        setEditingEvent(eventType);
        setFormData({
            title: eventType.title,
            duration: eventType.duration,
            urlSlug: eventType.urlSlug,
            description: eventType.description || '',
            color: eventType.color,
            scheduleId: eventType.scheduleId || null,
            bufferBefore: eventType.bufferBefore || 0,
            bufferAfter: eventType.bufferAfter || 0,
            customQuestions: eventType.customQuestions?.map(q => ({
                ...q,
                options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            })) || [],
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingEvent(null);
        setFormData({
            title: '',
            duration: 30,
            urlSlug: '',
            description: '',
            color: '#006BFF',
            scheduleId: null,
            bufferBefore: 0,
            bufferAfter: 0,
            customQuestions: [],
        });
        setShowModal(true);
    };

    const addQuestion = () => {
        setFormData({
            ...formData,
            customQuestions: [
                ...(formData.customQuestions || []),
                { label: '', type: 'text', required: true, options: [] }
            ]
        });
    };

    const removeQuestion = (index: number) => {
        const newQuestions = [...(formData.customQuestions || [])];
        newQuestions.splice(index, 1);
        setFormData({ ...formData, customQuestions: newQuestions });
    };

    const updateQuestion = (index: number, field: keyof CustomQuestion, value: any) => {
        const newQuestions = [...(formData.customQuestions || [])];
        newQuestions[index] = { ...newQuestions[index], [field]: value };
        setFormData({ ...formData, customQuestions: newQuestions });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const url = editingEvent
                ? `${API_URL}/api/event-types/${editingEvent.id}`
                : `${API_URL}/api/event-types`;

            const method = editingEvent ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setShowModal(false);
                fetchEventTypes();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to save event type');
            }
        } catch (error) {
            console.error('Error saving event type:', error);
            alert('Failed to save event type');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this event type?')) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/event-types/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                fetchEventTypes();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to delete event type');
            }
        } catch (error) {
            console.error('Error deleting event type:', error);
            alert('Failed to delete event type');
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Event Types</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage your scheduling options
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Link
                                href="/admin/schedules"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Schedules
                            </Link>
                            <Link
                                href="/admin/availability"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                Availability
                            </Link>
                            <Link
                                href="/admin/meetings"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                            >
                                View Meetings
                            </Link>
                        </div>
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
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        Create Event Type
                    </button>
                </div>

                {eventTypes.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No event types yet. Create one to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {eventTypes.map((eventType) => (
                            <div
                                key={eventType.id}
                                className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
                            >
                                <div
                                    className="h-2"
                                    style={{ backgroundColor: eventType.color }}
                                />
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                {eventType.title}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {eventType.duration} minutes
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(eventType)}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Edit"
                                            >
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
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(eventType.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete"
                                            >
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
                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {eventType.description && (
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                            {eventType.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
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
                                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                            />
                                        </svg>
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                            /admin/{eventType.urlSlug}
                                        </code>
                                    </div>

                                    <Link
                                        href={`/admin/${eventType.urlSlug}`}
                                        className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        View Booking Page
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <h3 className="text-2xl font-bold text-gray-800 mb-6">
                            {editingEvent ? 'Edit Event Type' : 'Create Event Type'}
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="30 Minute Meeting"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Duration (minutes) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="5"
                                    step="5"
                                    value={formData.duration}
                                    onChange={(e) =>
                                        setFormData({ ...formData, duration: parseInt(e.target.value) })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Buffer Before (min)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={formData.bufferBefore}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bufferBefore: parseInt(e.target.value) || 0 })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Block time before</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Buffer After (min)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="5"
                                        value={formData.bufferAfter}
                                        onChange={(e) =>
                                            setFormData({ ...formData, bufferAfter: parseInt(e.target.value) || 0 })
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Block time after</p>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    URL Slug *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.urlSlug}
                                    onChange={(e) =>
                                        setFormData({ ...formData, urlSlug: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    placeholder="30-min-meeting"
                                    pattern="[a-z0-9-]+"
                                    title="Only lowercase letters, numbers, and hyphens"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="A quick meeting to discuss..."
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Availability Schedule
                                </label>
                                <select
                                    value={formData.scheduleId || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, scheduleId: e.target.value ? parseInt(e.target.value) : null })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                >
                                    <option value="">Use Default Schedule</option>
                                    {schedules.map((schedule) => (
                                        <option key={schedule.id} value={schedule.id}>
                                            {schedule.name} {schedule.isDefault ? '(Default)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">
                                    Choose which schedule to use for this event type
                                </p>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Invitee Questions
                                </label>
                                <div className="space-y-4 mb-4">
                                    {formData.customQuestions?.map((question, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="text-sm font-medium text-gray-700">Question {index + 1}</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(index)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Label</label>
                                                    <input
                                                        type="text"
                                                        value={question.label}
                                                        onChange={(e) => updateQuestion(index, 'label', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                        placeholder="e.g. Phone Number"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                                                    <select
                                                        value={question.type}
                                                        onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                    >
                                                        <option value="text">Text (Short Answer)</option>
                                                        <option value="textarea">Textarea (Long Answer)</option>
                                                        <option value="phone">Phone Number</option>
                                                        <option value="select">Dropdown (Select)</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {question.type === 'select' && (
                                                <div className="mb-3">
                                                    <label className="block text-xs text-gray-500 mb-1">Options (comma separated)</label>
                                                    <input
                                                        type="text"
                                                        value={Array.isArray(question.options) ? question.options.join(', ') : question.options || ''}
                                                        onChange={(e) => updateQuestion(index, 'options', e.target.value.split(',').map(s => s.trim()))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                                        placeholder="Option A, Option B"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`required-${index}`}
                                                    checked={question.required}
                                                    onChange={(e) => updateQuestion(index, 'required', e.target.checked)}
                                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-900">
                                                    Required
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={addQuestion}
                                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors text-sm font-medium"
                                >
                                    + Add Question
                                </button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Color
                                </label>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) =>
                                        setFormData({ ...formData, color: e.target.value })
                                    }
                                    className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                                />
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
                                    {editingEvent ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
