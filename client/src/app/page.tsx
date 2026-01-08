import Link from 'next/link';
import { Suspense } from 'react';

export default function Home() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Calendly Clone</h1>
            <p className="text-lg text-gray-600 mb-8">Open Source Scheduling Infrastructure</p>
            <div className="flex gap-4">
                <Link
                    href="/admin"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Go to Admin
                </Link>
            </div>
        </div>
    );
}
