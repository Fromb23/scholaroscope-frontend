'use client';

import { useParams, useRouter } from 'next/navigation';
import { getSubjectProfileExtensions, SubjectSlotContext } from '@/app/core/registry/subjectSlot';
import { useSubjects } from '@/app/core/hooks/useAcademic';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import '@/app/plugins/cbc/registry/subjectExtension';
import { BookOpen } from 'lucide-react';

export default function SubjectDetailPage() {
    const params = useParams();
    const router = useRouter();

    const rawId = params?.id;
    const subjectId = Array.isArray(rawId)
        ? parseInt(rawId[0], 10)
        : parseInt(rawId as string, 10);

    const { subjects, loading, error } = useSubjects();

    if (loading) return <LoadingSpinner />;

    if (error) {
        return (
            <ErrorBanner
                onDismiss={() => router.back()}
                message="Failed to load subject"
            />
        );
    }

    if (isNaN(subjectId)) {
        return (
            <ErrorBanner
                onDismiss={() => router.back()}
                message="Invalid subject ID"
            />
        );
    }

    const subject = subjects?.find((s) => s.id === subjectId);

    if (!subject) {
        return (
            <ErrorBanner
                onDismiss={() => router.back()}
                message="Subject not found"
            />
        );
    }

    const ctx: SubjectSlotContext = {
        subjectId: subject.id,
        curriculum_type: subject.curriculum_type,
    };

    const extensions = getSubjectProfileExtensions(ctx);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-muted-foreground" />
                <h1 className="text-2xl font-semibold">{subject.name}</h1>
            </div>

            {extensions.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                    {extensions.map((ext) => (
                        <a
                            key={ext.key}
                            href={ext.href(ctx)}
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
                        >
                            {ext.label}
                        </a>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    No curriculum tools registered for this subject.
                </p>
            )}
        </div>
    );
}