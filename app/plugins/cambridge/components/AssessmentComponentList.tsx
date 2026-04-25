// ============================================================================
// app/plugins/cambridge/components/AssessmentComponentList.tsx
//
// List of assessment components (papers, coursework, etc.) for a subject.
// ============================================================================

'use client';

import type { AssessmentComponent } from '../types';

interface AssessmentComponentListProps {
  components: AssessmentComponent[];
  onEdit?: (component: AssessmentComponent) => void;
  onDelete?: (component: AssessmentComponent) => void;
}

export function AssessmentComponentList({ components, onEdit, onDelete }: AssessmentComponentListProps) {
  return (
    <div>
      {/* TODO: UI implementation */}
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Weight</th>
            <th>Max Marks</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.id}>
              <td>{c.code}</td>
              <td>{c.name}</td>
              <td>{c.component_type}</td>
              <td>{c.weight}%</td>
              <td>{c.max_marks}</td>
              <td>
                {onEdit && <button onClick={() => onEdit(c)}>Edit</button>}
                {onDelete && <button onClick={() => onDelete(c)}>Delete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
