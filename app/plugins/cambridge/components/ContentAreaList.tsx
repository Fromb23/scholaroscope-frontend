// ============================================================================
// app/plugins/cambridge/components/ContentAreaList.tsx
//
// List of content areas for a Cambridge subject.
// ============================================================================

'use client';

import type { ContentArea } from '../types';

interface ContentAreaListProps {
  contentAreas: ContentArea[];
  onSelect?: (contentArea: ContentArea) => void;
  onEdit?: (contentArea: ContentArea) => void;
  onDelete?: (contentArea: ContentArea) => void;
}

export function ContentAreaList({ contentAreas, onSelect, onEdit, onDelete }: ContentAreaListProps) {
  return (
    <div>
      {/* TODO: UI implementation */}
      <ul>
        {contentAreas.map((ca) => (
          <li key={ca.id}>
            <span>{ca.code} — {ca.name}</span>
            <span> ({ca.topic_count} topics)</span>
            {onSelect && <button onClick={() => onSelect(ca)}>View</button>}
            {onEdit && <button onClick={() => onEdit(ca)}>Edit</button>}
            {onDelete && <button onClick={() => onDelete(ca)}>Delete</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
