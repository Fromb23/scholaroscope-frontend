# Reporting engine route catalogue

This catalogue is the compatibility migration map. Compatibility entries must preserve valid period, focus, table state, authority mode, and `returnTo` parameters.

| Existing entry | Canonical object | Projection | Treatment |
| --- | --- | --- | --- |
| `/reports` | workspace | overview | Canonical catalogue |
| `/reports/workspace` | workspace | overview | Canonical alias rendering the same catalogue |
| `/reports/students` | learner overview collection | overview | Compatibility collection name retained |
| `/reports/students/{id}` | learner overview | overview | Compatibility shell retained |
| `/reports/learners/{id}/overview` | learner overview | overview | Canonical |
| `/reports/learners/{id}/subject` | learner subject | overview | Compatibility intent adapter |
| `/reports/learners/{id}/assessments` | learner subject | assessments-results | Compatibility intent adapter; legacy assessment focus normalized |
| `/reports/learners/{id}/assignments` | learner subject | assignments | Compatibility intent adapter; `highlightAssignment` normalized |
| `/reports/attendance?student=...` | learner subject | attendance | Compatibility intent adapter; session focus retained |
| `/reports/learners/{learnerId}/cohort-subjects/{cohortSubjectId}` | learner subject | selected projection | Canonical |
| `/learners/{id}/portfolio` | learner portfolio | portfolio | Compatibility URL retained |
| `/reports/learners/{id}/portfolio` | learner portfolio | portfolio | Canonical |
| `/reports/cohorts` | cohort collection | overview | Canonical collection |
| `/reports/cohorts/{id}` | cohort | overview | Canonical |
| `/reports/subjects` | workspace-subject collection | overview | Canonical collection |
| `/reports/subjects/{id}` | workspace subject | overview | Canonical |
| `/reports/cohort-subjects/{id}` | cohort subject | selected projection | Canonical central academic report |
| `/reports/instructor/cohort-subjects/{id}` | cohort subject | selected projection | Compatibility route rendering the canonical shell |
| `/reports/instructor/cohort-subjects/{id}/class-report` | cohort subject | overview | Compatibility route using the authoritative class-subject payload/export |
| `/reports/instructors/{id}` | instructor | overview | Canonical supervision object |
| `/reports/instructor` | instructor/self teaching | overview | Compatibility teaching entry |
| `/reports/attendance` | scoped report intent | attendance | Secondary compatibility explorer |
| `/reports/assessments` | scoped report intent | assessments-results | Secondary compatibility explorer |
| `/cbc/progress` | workspace subject/cohort subject | curriculum-progress | CBC compatibility entry; CBC remains calculation owner |
| `/cbc/progress/cohort/{id}` | cohort subject | curriculum-progress | CBC compatibility entry |
| `/cbc/progress/learner/{id}` | learner subject | curriculum-progress | CBC compatibility entry |
| `/cbc/assessment-results...` | cohort subject/learner subject | assessments-results | CBC compatibility entry; official/freshness semantics remain CBC-owned |

Operational CBC Browse, Teaching, and Evidence routes are not report objects. They enter a canonical report using explicit intent and retain their exact operational URL as origin.
