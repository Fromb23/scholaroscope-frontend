'use client';

import { Card } from '@/app/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { AttendanceBar } from '@/app/core/components/reports/AttendanceBar';
import type { AttendanceReportRow } from '@/app/core/hooks/reports/useAttendanceReportPage';

export function AttendanceReportTable({ summaries }: { summaries: AttendanceReportRow[] }) {
    return (
        <Card>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Attendance Records</h3>
                <span className="text-xs text-gray-500">{summaries.length} records</span>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Rate</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {summaries.map((summary) => (
                        <TableRow key={summary.id}>
                            <TableCell>
                                <p className="font-medium text-gray-900">{summary.student_name}</p>
                                <p className="text-xs text-gray-500">{summary.student_admission}</p>
                            </TableCell>
                            <TableCell>
                                <p className="font-medium text-gray-900">{summary.subject_name}</p>
                                <p className="text-xs text-gray-500">{summary.subject_code}</p>
                            </TableCell>
                            <TableCell>{summary.total_sessions}</TableCell>
                            <TableCell>
                                <span className="font-medium text-green-600">{summary.present_count}</span>
                            </TableCell>
                            <TableCell>
                                <span className="font-medium text-red-600">{summary.absent_count}</span>
                            </TableCell>
                            <TableCell>
                                <span className="font-medium text-yellow-600">{summary.late_count}</span>
                            </TableCell>
                            <TableCell>
                                <AttendanceBar percentage={summary.attendance_percentage} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}
