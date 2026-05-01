// ============================================================================
// app/plugins/cambridge/components/AssessmentComponentList.tsx
//
// List of assessment components (papers, coursework, etc.) for a subject.
// ============================================================================

'use client';

import type { CambridgeNormalizedAssessmentUnit } from '../types';

interface AssessmentComponentListProps {
  components: CambridgeNormalizedAssessmentUnit[];
}

export function AssessmentComponentList({ components }: AssessmentComponentListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="pb-2 pr-2">Title</th>
            <th className="pb-2 pr-2">Type</th>
            <th className="pb-2 pr-2">Weight</th>
            <th className="pb-2">Max Mark</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.id} className="border-b border-gray-100">
              <td className="py-2 pr-2">{c.title}</td>
              <td className="py-2 pr-2">{c.assessment_type}</td>
              <td className="py-2 pr-2">{c.weight_percentage ?? '—'}</td>
              <td className="py-2">{c.max_mark ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
