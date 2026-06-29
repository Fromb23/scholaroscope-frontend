import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assignments/AssignmentLifecycleActionCard.tsx'),
  'utf8',
);

describe('AssignmentLifecycleActionCard teaching memory behavior', () => {
  it('renders assignment progress before lifecycle actions', () => {
    const cardSource = source();

    expect(cardSource).toContain('AssignmentProgressTracker');
    expect(cardSource.indexOf('<AssignmentProgressTracker')).toBeLessThan(cardSource.indexOf('Current action'));
  });

  it('renders one primary action inline and hides secondary actions under More', () => {
    const cardSource = source();

    expect(cardSource).toContain('lifecycleState.next_action');
    expect(cardSource).toContain('ActionMenu');
    expect(cardSource).toContain('moreActions');
    expect(cardSource).not.toContain('variant={getActionButtonVariant(action)}');
  });

  it('keeps destructive draft deletion inside More actions', () => {
    const cardSource = source();

    expect(cardSource).toContain("destructive: action === 'DELETE_DRAFT'");
    expect(cardSource).not.toContain('variant={getActionButtonVariant(action)}');
  });
});
