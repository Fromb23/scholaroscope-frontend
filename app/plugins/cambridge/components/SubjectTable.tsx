// ============================================================================
// app/plugins/cambridge/components/SubjectTable.tsx
//
// Table display of Cambridge subjects with actions.
// ============================================================================

'use client';

import type { CambridgeInstallationSubject } from '../types';

interface SubjectTableProps {
  subjects: CambridgeInstallationSubject[];
  onView?: (subject: CambridgeInstallationSubject) => void;
  onRename?: (subject: CambridgeInstallationSubject) => void;
  onToggle?: (subject: CambridgeInstallationSubject) => void;
  isAdmin?: boolean;
  loadingSubjectId?: number | null;
}

export function SubjectTable({
  subjects,
  onView,
  onRename,
  onToggle,
  isAdmin = false,
  loadingSubjectId = null,
}: SubjectTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left border-b border-gray-200">
            <th className="pb-2 pr-2">Name</th>
            <th className="pb-2 pr-2">Code</th>
            <th className="pb-2 pr-2">Programme</th>
            <th className="pb-2 pr-2">Structure</th>
            <th className="pb-2 pr-2">Status</th>
            <th className="pb-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id} className="border-b border-gray-100">
              <td className="py-2 pr-2">
                <div className="font-medium text-gray-900">{subject.display_name}</div>
                <div className="text-xs text-gray-500">{subject.subject_name}</div>
              </td>
              <td className="py-2 pr-2">{subject.subject_code ?? '—'}</td>
              <td className="py-2 pr-2">{subject.programme_code ?? '—'}</td>
              <td className="py-2 pr-2">{subject.structure_mode ?? '—'}</td>
              <td className="py-2 pr-2">
                <span className={subject.enabled ? 'text-green-700' : 'text-gray-500'}>
                  {subject.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </td>
              <td className="py-2 flex flex-wrap gap-2">
                {onView ? <button onClick={() => onView(subject)} className="text-blue-600">View</button> : null}
                {isAdmin && onRename ? (
                  <button onClick={() => onRename(subject)} className="text-gray-700">
                    Rename
                  </button>
                ) : null}
                {isAdmin && onToggle ? (
                  <button
                    onClick={() => onToggle(subject)}
                    className={subject.enabled ? 'text-red-600' : 'text-green-700'}
                    disabled={loadingSubjectId === subject.id}
                  >
                    {loadingSubjectId === subject.id
                      ? 'Saving...'
                      : subject.enabled
                        ? 'Disable'
                        : 'Enable'}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
