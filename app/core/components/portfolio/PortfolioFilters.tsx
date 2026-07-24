import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import type { AcademicYear, Term } from '@/app/core/types/academic';
import type {
  LearnerPortfolioFilters,
  PortfolioLearningArea,
  PortfolioLearningOutcome,
} from '@/app/core/types/portfolio';

function numericValue(value: number | null | undefined): string {
  return value ? String(value) : '';
}

export function PortfolioFilters({
  filters,
  academicYears,
  terms,
  learningAreas,
  outcomes,
  sources,
  onChange,
  onReset,
}: {
  filters: LearnerPortfolioFilters;
  academicYears: AcademicYear[];
  terms: Term[];
  learningAreas: PortfolioLearningArea[];
  outcomes: PortfolioLearningOutcome[];
  sources: string[];
  onChange: (next: LearnerPortfolioFilters) => void;
  onReset: () => void;
}) {
  const academicYearOptions = [
    { value: '', label: 'All years' },
    ...academicYears.map((year) => ({ value: year.id, label: year.name })),
  ];
  const termOptions = [
    { value: '', label: 'All terms' },
    ...terms.map((term) => ({ value: term.id, label: term.name })),
  ];
  const learningAreaOptions = [
    { value: '', label: 'All areas' },
    ...learningAreas.flatMap((area) => {
      const id = area.cohort_subject_id ?? area.id;
      return id ? [{ value: id, label: `${area.code ? `${area.code} ` : ''}${area.name}` }] : [];
    }),
  ];
  const outcomeOptions = [
    { value: '', label: 'All outcomes' },
    ...outcomes.map((outcome) => ({
      value: outcome.id,
      label: outcome.code || `Outcome ${outcome.id}`,
    })),
  ];
  const sourceOptions = [
    { value: '', label: 'All sources' },
    ...sources.map((source) => ({ value: source, label: source.replace(/_/g, ' ') })),
  ];

  const update = (key: keyof LearnerPortfolioFilters, value: string) => {
    onChange({
      ...filters,
      page: null,
      [key]: value ? (key === 'source' ? value : Number(value)) : null,
    });
  };

  return (
    <div className="grid gap-3 rounded-xl border theme-border theme-surface p-4 md:grid-cols-3 xl:grid-cols-6">
      <Select
        label="Academic year"
        value={numericValue(filters.academic_year)}
        options={academicYearOptions}
        onChange={(event) => update('academic_year', event.target.value)}
      />

      <Select
        label="Term"
        value={numericValue(filters.term)}
        options={termOptions}
        onChange={(event) => update('term', event.target.value)}
      />

      <Select
        label="Learning area"
        value={numericValue(filters.cohort_subject)}
        options={learningAreaOptions}
        onChange={(event) => update('cohort_subject', event.target.value)}
      />

      <Select
        label="Outcome"
        value={numericValue(filters.outcome)}
        options={outcomeOptions}
        onChange={(event) => update('outcome', event.target.value)}
      />

      <Select
        label="Evidence source"
        value={filters.source ?? ''}
        options={sourceOptions}
        onChange={(event) => update('source', event.target.value)}
      />

      <div className="flex items-end">
        <Button type="button" variant="secondary" className="w-full" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
