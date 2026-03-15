// ============================================================================
// components/dashboard/RecentActivity.tsx - Activity Feed
// ============================================================================

import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';

interface Activity {
    id: number;
    title: string;
    description: string;
    time: string;
    type: 'session' | 'student' | 'assessment';
}

export function RecentActivity({ activities }: { activities: Activity[] }) {
    const typeColors = {
        session: 'bg-blue-100 text-blue-600',
        student: 'bg-green-100 text-green-600',
        assessment: 'bg-yellow-100 text-yellow-600',
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-4">
                            <div className={`mt-1 h-2 w-2 rounded-full ${typeColors[activity.type]}`} />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                <p className="text-sm text-gray-600">{activity.description}</p>
                                <p className="mt-1 text-xs text-gray-500">{activity.time}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
