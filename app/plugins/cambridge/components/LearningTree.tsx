// ============================================================================
// app/plugins/cambridge/components/LearningTree.tsx
//
// Hierarchical tree of content areas → topics → learning objectives.
// ============================================================================

'use client';

import type { ContentArea, Topic, LearningObjective } from '../types';

interface LearningTreeNode {
  contentArea: ContentArea;
  topics: Array<{
    topic: Topic;
    objectives: LearningObjective[];
  }>;
}

interface LearningTreeProps {
  nodes: LearningTreeNode[];
  onObjectiveClick?: (objective: LearningObjective) => void;
}

export function LearningTree({ nodes, onObjectiveClick }: LearningTreeProps) {
  return (
    <div>
      {/* TODO: UI implementation */}
      {nodes.map((node) => (
        <div key={node.contentArea.id}>
          <h3>{node.contentArea.name}</h3>
          {node.topics.map((t) => (
            <div key={t.topic.id}>
              <h4>{t.topic.name}</h4>
              <ul>
                {t.objectives.map((obj) => (
                  <li key={obj.id}>
                    <button onClick={() => onObjectiveClick?.(obj)}>
                      {obj.code}: {obj.description}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
