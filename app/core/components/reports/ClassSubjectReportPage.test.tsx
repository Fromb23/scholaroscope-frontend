import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  ClassSubjectReportHeaderContext,
  resolveClassSubjectReportTermLabel,
} from './ClassSubjectReportPage';

describe('class subject report header identity', () => {
  it('shows instructor viewer context without an alarming missing-assignment message', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectReportHeaderContext, {
        isInstructorRoute: true,
        assignedInstructor: null,
        viewerName: 'Test User',
        periodLabel: '2nd Term',
        generatedAt: '2026-06-18T08:00:00Z',
      }),
    );

    expect(html).toContain('Viewing as Test User');
    expect(html).not.toContain('Instructor not assigned yet');
    expect(html).not.toContain('No formal instructor assignment recorded');
  });

  it('renders the canonical assigned instructor when one exists', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectReportHeaderContext, {
        isInstructorRoute: true,
        assignedInstructor: {
          id: 12,
          name: 'Jane Doe',
          email: 'jane@example.test',
        },
        viewerName: 'Test User',
        periodLabel: '2nd Term',
        generatedAt: '2026-06-18T08:00:00Z',
      }),
    );

    expect(html).toContain('Viewing as Test User');
    expect(html).toContain('Assigned instructor: Jane Doe');
    expect(html).toContain('jane@example.test');
  });

  it('allows admin views to show neutral setup information for missing assignment', () => {
    const html = renderToStaticMarkup(
      createElement(ClassSubjectReportHeaderContext, {
        isInstructorRoute: false,
        assignedInstructor: null,
        viewerName: null,
        periodLabel: '2nd Term',
        generatedAt: '2026-06-18T08:00:00Z',
      }),
    );

    expect(html).toContain('No formal instructor assignment recorded');
    expect(html).not.toContain('Viewing as');
    expect(html).not.toContain('Instructor not assigned yet');
  });
});

describe('class subject report term truthfulness', () => {
  it('renders the resolved term name instead of deriving a number from the URL id', () => {
    const label = resolveClassSubjectReportTermLabel({
      selectedTermId: 1,
      report: {
        period: {
          term_id: 1,
          term_name: '2nd Term',
          start_date: '2026-01-01',
          end_date: '2026-04-30',
          label: '2nd Term',
        },
      },
      intelligence: {
        scope: {
          cohort_subject_id: 3,
          cohort_id: 5,
          cohort_name: 'Grade 10 Yellow',
          subject_id: 9,
          subject_name: 'Computer Studies',
          subject_code: 'CS',
          term_id: 1,
          term_name: '2nd Term',
          term_resolution: 'EXPLICIT',
        },
      },
      terms: [{ id: 1, name: '2nd Term' }],
    });

    expect(label).toBe('2nd Term');
    expect(label).not.toBe('Term 1');
  });

  it('keeps the report and intelligence panel on the same resolved term label', () => {
    const periodLabel = resolveClassSubjectReportTermLabel({
      selectedTermId: 1,
      report: {
        period: {
          term_id: 1,
          term_name: '2nd Term',
          start_date: '2026-01-01',
          end_date: '2026-04-30',
          label: '2nd Term',
        },
      },
      intelligence: {
        scope: {
          cohort_subject_id: 3,
          cohort_id: 5,
          cohort_name: 'Grade 10 Yellow',
          subject_id: 9,
          subject_name: 'Computer Studies',
          subject_code: 'CS',
          term_id: 1,
          term_name: '2nd Term',
          term_resolution: 'EXPLICIT',
        },
      },
      terms: [{ id: 1, name: '2nd Term' }],
    });

    expect(periodLabel).toBe('2nd Term');
  });
});
