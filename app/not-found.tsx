'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
    const router = useRouter();
    const [canGoBack, setCanGoBack] = useState(false);

    useEffect(() => {
        // Can go back if there's a referrer within the same origin
        const referrer = document.referrer;
        if (referrer && referrer.startsWith(window.location.origin)) {
            setCanGoBack(true);
        }
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-100 mb-6">
                        <Search className="h-12 w-12 text-purple-600" />
                    </div>
                    <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mb-3">Page not found</h2>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        The page you're looking for doesn't exist
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {canGoBack && (
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go back
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
                    >
                        <Home className="h-4 w-4" />
                        Back to dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}