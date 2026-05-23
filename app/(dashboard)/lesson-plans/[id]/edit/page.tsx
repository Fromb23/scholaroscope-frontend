'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { LessonPlanForm } from '@/app/core/components/lessonPlans/LessonPlanForm';
import {
    useLessonPlanCurriculumContext,
    useLessonPlanDetail,
} from '@/app/core/hooks/useLessonPlans';

function getLessonPlanId(params: ReturnType<typeof useParams>): number | null {
    const rawId = params.id;
    const resolvedId = Array.isArray(rawId) ? rawId[0] : rawId;
    const numericId = Number(resolvedId);

    return Number.isFinite(numericId) ? numericId : null;
}

export default function Page() {
    const params = useParams();
    const lessonPlanId = getLessonPlanId(params);
    const { lessonPlan, loading, error, refetch, updateLessonPlan } = useLessonPlanDetail(lessonPlanId);
    const {
        curriculumContext,
        loading: curriculumLoading,
        error: curriculumError,
    } = useLessonPlanCurriculumContext(lessonPlan?.cohort_subject ?? null);

    if (loading && !lessonPlan) {
        return <LoadingSpinner message="Loading lesson plan..." fullScreen={false} />;
    }

    if (error) {
        return (
            <ErrorState
                fullScreen={false}
                message={error}
                onRetry={() => {
                    void refetch();
                }}
            />
        );
    }

    if (!lessonPlan) {
        return (
            <ErrorState
                fullScreen={false}
                message="This lesson plan could not be found."
            />
        );
    }

    if (lessonPlan.cohort_subject && curriculumLoading && !curriculumContext && !curriculumError) {
        return <LoadingSpinner message="Loading lesson plan references..." fullScreen={false} />;
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href={`/lesson-plans/${lessonPlan.id}`}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Lesson Plan</h1>
                    <p className="mt-1 text-gray-600">
                        Update the teacher-authored sections of this lesson plan.
                    </p>
                </div>
            </div>

            <LessonPlanForm
                lessonPlan={lessonPlan}
                onSubmit={updateLessonPlan}
                curriculumContext={curriculumContext}
                curriculumContextError={curriculumError}
            />
        </div>
    );
}
