import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CohortAssignModal } from './InstructorModals';
import { instructorsAPI } from '@/app/core/api/instructors';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const instructorDetailState = vi.hoisted(() => ({
  detail: {
    cohort_assignments: [],
    teaching_assignments: [],
  },
  refetch: vi.fn(),
}));

vi.mock('@/app/components/ui/Modal', () => ({
  default: ({ children, footer }: { children: React.ReactNode; footer: React.ReactNode }) => (
    <section data-testid="modal">{children}{footer}</section>
  ),
}));

vi.mock('@/app/core/hooks/useInstructors', () => ({
  useInstructorDetail: () => ({
    instructor: instructorDetailState.detail,
    loading: false,
    refetch: instructorDetailState.refetch,
  }),
}));

vi.mock('@/app/core/api/academic', () => ({
  cohortAPI: { getSubjectOptions: vi.fn().mockResolvedValue([]) },
}));

function assignedSubject(id: number, subjectName: string, currentInstructorName: string, email: string) {
  return {
    id,
    cohort_id: 9,
    cohort_subject_id: id,
    source: 'cbc',
    teaching_link_id: id + 1000,
    cbc_cohort_subject_id: id + 1000,
    cohort_name: `Year ${id}`,
    cohort_level: `Grade ${id}`,
    subject_name: subjectName,
    subject_code: `SUB-${id}`,
    academic_year: '2026',
    academic_year_name: '2026 Academic Year',
    curriculum_name: 'CBC',
    curriculum_type: 'CBE',
    assigned: true,
    assigned_to_current_instructor: false,
    current_instructor_name: currentInstructorName,
    current_instructor_email: email,
    can_reassign: true,
  };
}

function availableSubject() {
  return {
    id: 33,
    cohort_id: 9,
    cohort_subject_id: 33,
    source: 'kernel',
    subject_id: 303,
    cohort_name: 'Year 7 East',
    cohort_level: 'Grade 7',
    subject_name: 'Mathematics',
    subject_code: 'MATH-7',
    academic_year: '2026',
    curriculum_name: 'Cambridge',
    curriculum_type: 'CAMBRIDGE',
    assigned: false,
  };
}

function buttonWithText(root: ReactTestInstance, text: string) {
  return root.findAll((node) => node.type === 'button' && textContent(node) === text)[0];
}

function textContent(node: ReactTestInstance): string {
  return node.children.map((child) => (
    typeof child === 'string' ? child : textContent(child)
  )).join('');
}

describe('CohortAssignModal interactions', () => {
  let renderer: ReactTestRenderer | null = null;
  const onAssignmentsChanged = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    instructorDetailState.detail = { cohort_assignments: [], teaching_assignments: [] };
    instructorDetailState.refetch.mockReset();
    onAssignmentsChanged.mockReset();
    vi.spyOn(instructorsAPI, 'getAssignableSubjects').mockResolvedValue([
      availableSubject(),
      assignedSubject(1, 'English', 'First Teacher', 'first@example.com'),
      assignedSubject(2, 'Physics', 'Second Teacher', 'second@example.com'),
    ]);
    vi.spyOn(instructorsAPI, 'assignToCohortSubject').mockResolvedValue();
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function renderModal() {
    await act(async () => {
      renderer = create(
        <CohortAssignModal
          isOpen
          onClose={vi.fn()}
          instructorId={77}
          instructorName="Selected Instructor"
          onAssignmentsChanged={onAssignmentsChanged}
        />,
      );
      await Promise.resolve();
    });
    return renderer!.root;
  }

  it('puts confirmation in the clicked reassignment row and submits its exact source-aware reference', async () => {
    const root = await renderModal();
    const reassignButtons = root.findAll((node) => node.type === 'button' && node.children.join('') === 'Reassign');

    await act(async () => reassignButtons[1].props.onClick());

    const physicsRow = root.findAll((node) => node.type === 'div' && node.props.className?.includes('border-gray-200 bg-gray-50 p-3'))
      .find((node) => textContent(node).includes('Physics'));
    expect(physicsRow && textContent(physicsRow)).toContain('Confirm reassignment');
    expect(physicsRow && textContent(physicsRow)).toContain('Currently assigned to Second Teacher. Reassign to Selected Instructor.');
    expect(root.findAll((node) => node.type === 'button' && node.children.join('') === 'Confirm Reassign')).toHaveLength(1);

    await act(async () => buttonWithText(root, 'Confirm Reassign').props.onClick());

    expect(instructorsAPI.assignToCohortSubject).toHaveBeenCalledWith(77, expect.objectContaining({
      source: 'cbc',
      teaching_link_id: 1002,
      cbc_cohort_subject_id: 1002,
    }));
    expect(instructorDetailState.refetch).toHaveBeenCalled();
    expect(onAssignmentsChanged).toHaveBeenCalled();
    expect(root.findAll((node) => node.type === 'button' && node.children.join('') === 'Confirm Reassign')).toHaveLength(0);
  });

  it('moves, cancels, and retains a failed inline confirmation for retry', async () => {
    const root = await renderModal();
    const reassignButtons = () => root.findAll((node) => node.type === 'button' && node.children.join('') === 'Reassign');

    await act(async () => reassignButtons()[0].props.onClick());
    await act(async () => reassignButtons()[1].props.onClick());
    expect(root.findAll((node) => node.type === 'button' && node.children.join('') === 'Confirm Reassign')).toHaveLength(1);

    await act(async () => buttonWithText(root, 'Cancel').props.onClick());
    expect(root.findAll((node) => node.type === 'button' && node.children.join('') === 'Confirm Reassign')).toHaveLength(0);

    vi.mocked(instructorsAPI.assignToCohortSubject).mockRejectedValueOnce(new Error('Assignment denied'));
    await act(async () => reassignButtons()[1].props.onClick());
    await act(async () => buttonWithText(root, 'Confirm Reassign').props.onClick());
    expect(textContent(root.findAll((node) => node.props.role === 'alert')[0])).toContain('Retrying is safe');
    expect(root.findAll((node) => node.type === 'button' && node.children.join('') === 'Confirm Reassign')).toHaveLength(1);
  });

  it('filters all sections with normalized search and clears a hidden selection', async () => {
    const root = await renderModal();
    const search = root.findByProps({ id: 'cohort-subject-search' });

    await act(async () => search.props.onChange({ target: { value: '  SECOND@EXAMPLE.COM  ' } }));
    expect(root.findAll((node) => textContent(node).includes('Physics'))).not.toHaveLength(0);
    expect(root.findAll((node) => textContent(node).includes('English'))).toHaveLength(0);

    await act(async () => buttonWithText(root, 'Clear search').props.onClick());
    expect(root.findAll((node) => textContent(node).includes('English'))).not.toHaveLength(0);
  });

  it('matches class, subject, code, year, curriculum, and teacher fields while preserving dropdown keyboard roles', async () => {
    const root = await renderModal();
    const search = root.findByProps({ id: 'cohort-subject-search' });

    for (const query of ['Year 1', 'English', 'SUB-1', '2026', 'CBC', 'First Teacher']) {
      await act(async () => search.props.onChange({ target: { value: query } }));
      expect(root.findAll((node) => textContent(node).includes('English'))).not.toHaveLength(0);
    }

    await act(async () => search.props.onChange({ target: { value: 'Math' } }));
    const trigger = root.findByProps({ 'aria-haspopup': 'listbox' });
    await act(async () => trigger.props.onKeyDown({ key: 'ArrowDown', preventDefault: vi.fn() }));
    expect(root.findByProps({ role: 'listbox' })).toBeTruthy();
    expect(root.findAll((node) => node.props.role === 'option')).toHaveLength(1);
    expect(root.findAll((node) => node.props.role === 'option')[0].props['aria-selected']).toBe(false);

    await act(async () => root.findAll((node) => node.props.role === 'option')[0].props.onClick());
    await act(async () => search.props.onChange({ target: { value: 'Physics' } }));
    expect(root.findAll((node) => node.props.role === 'option')).toHaveLength(0);
    expect(root.findAll((node) => textContent(node).includes('No cohort subjects match "Physics"'))).not.toHaveLength(0);
  });
});
