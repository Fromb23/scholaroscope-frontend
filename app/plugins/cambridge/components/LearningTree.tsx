// ============================================================================
// app/plugins/cambridge/components/LearningTree.tsx
//
// Hierarchical tree of content areas → topics → learning objectives.
// ============================================================================

'use client';

import { useMemo } from 'react';
import type { CambridgeNormalizedLearningUnit } from '../types';

interface LearningTreeProps {
  units: CambridgeNormalizedLearningUnit[];
}

function buildDepthMap(units: CambridgeNormalizedLearningUnit[]) {
  const byId = new Map<number, CambridgeNormalizedLearningUnit>();
  for (const unit of units) {
    byId.set(unit.id, unit);
  }

  const depthMap = new Map<number, number>();
  const getDepth = (unit: CambridgeNormalizedLearningUnit): number => {
    if (depthMap.has(unit.id)) {
      return depthMap.get(unit.id) as number;
    }
    if (!unit.parent_id) {
      depthMap.set(unit.id, 0);
      return 0;
    }
    const parent = byId.get(unit.parent_id);
    const depth = parent ? getDepth(parent) + 1 : 0;
    depthMap.set(unit.id, depth);
    return depth;
  };

  return units.map((unit) => ({
    unit,
    depth: getDepth(unit),
  }));
}

export function LearningTree({ units }: LearningTreeProps) {
  const rows = useMemo(() => buildDepthMap(units), [units]);

  return (
    <div className="space-y-2">
      {rows.map(({ unit, depth }) => (
        <div
          key={unit.id}
          className="rounded-lg border border-gray-200 bg-white p-3"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="font-medium text-gray-900">{unit.title}</div>
          <div className="text-xs text-gray-500">{unit.unit_type}</div>
          {unit.description ? (
            <p className="mt-1 text-sm text-gray-600">{unit.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
