// ============================================================================
// app/plugins/cambridge/components/SubjectTable.tsx
//
// Table display of Cambridge subjects with actions.
// ============================================================================

'use client';

import type { CambridgeSubject } from '../types';

interface SubjectTableProps {
  subjects: CambridgeSubject[];
  onEdit?: (subject: CambridgeSubject) => void;
  onDelete?: (subject: CambridgeSubject) => void;
  onView?: (subject: CambridgeSubject) => void;
}

export function SubjectTable({ subjects, onEdit, onDelete, onView }: SubjectTableProps) {
  return (
    <div>
      {/* TODO: UI implementation */}
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Programme</th>
            <th>Level</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((subject) => (
            <tr key={subject.id}>
              <td>{subject.code}</td>
              <td>{subject.name}</td>
              <td>{subject.programme}</td>
              <td>{subject.level}</td>
              <td>
                {onView && <button onClick={() => onView(subject)}>View</button>}
                {onEdit && <button onClick={() => onEdit(subject)}>Edit</button>}
                {onDelete && <button onClick={() => onDelete(subject)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
