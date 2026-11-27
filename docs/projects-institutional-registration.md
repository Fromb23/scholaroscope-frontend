# Institutional official-project registration

The catalogue uses the server-provided `available_actions` and eligible teaching targets. Official registration calls the atomic catalogue registration endpoint; operational project lists and details use deployment records only. Dates may span terms. The server remains authoritative for target eligibility, schedule validity, lifecycle state, urgency, permission scope, instructor synchronization, and learner synchronization.

## Olympic High School acceptance procedure

1. Confirm the official Grade 10 Computer Studies definition has zero `ProjectDefinitionAdoption` and zero `ProjectDeployment` records for Olympic High School.
2. Sign in as a workspace-management user whom the server grants `projects.catalogue.register` and scoped `projects.deploy`.
3. Open **Projects**, then **Catalogue**.
4. Confirm **Computer Studies Grade 10 SBA Practical** shows **Register project** and one eligible Grade 10 — Computer Studies teaching target.
5. Open registration and verify the project identity, Olympic High School, affected instructors, and official schedule constraints.
6. Verify the sole target is visibly preselected. If the server returns multiple targets, explicitly choose Grade 10 — Computer Studies.
7. Select or verify the operational start and final deadline. Confirm a complete authority-fixed window cannot be edited.
8. Choose **Review registration**, verify the confirmation summary, then choose **Register and deploy** once.
9. Verify the success message and redirect to `/projects/{deploymentId}` with the original safe `returnTo` value.
10. Verify the deployment page shows the target, lifecycle, counts, time-elapsed progress, textual urgency, countdown, tasks, and assessment navigation.
11. Sign in as the assigned Computer Studies instructor and verify the deployment appears in **Projects** and its tasks are accessible.
12. Sign in as an unrelated instructor and verify the deployment is absent and direct access is rejected by the server.
13. Verify supervisor and workspace-manager visibility using accounts with the corresponding server-scoped permissions; do not infer access from role names.
14. Query the database for Olympic High School and the official definition version; verify exactly one active adoption and one deployment exist.
15. Replay the same registration request with its original `Idempotency-Key`; verify the response identifies the same deployment and the database still contains exactly one adoption and one deployment.

## Request-workload contract

Project deployment resources load for the active surface, not for every tab at
workspace entry. The overview performs one deployment-detail request instead of
the previous detail-plus-nine request graph. Participants, groups, evidence,
observations, evaluations, results and administration data become enabled only
for the tab or task workflow that consumes them. The evidence-type contract is
stable reference data and is requested only when evidence capture opens.

Successful lifecycle mutations place the authoritative deployment response into
the organization-scoped detail query and invalidate active dependent resources.
They do not immediately refetch the unchanged detail. Error/conflict handling
still refreshes the exact deployment because another actor may have changed its
state. Workspace identity remains present in every project query key.

## Evaluation workspace law

Every project screen is oriented to its lifecycle stage and one primary next
action; secondary actions may move under More. URL state owns deployment, task,
scope, group, participant/evaluation, section and sanitized `returnTo` values.
Drafts are keyed by stable record IDs, never list positions. Previous and Next
preserve drafts; a failed save preserves both input and position.

Save Draft and Save & Next persist editable work only. Finalize is a separate,
confirmed action that explains locking and downstream projection. Group scores
are starting values for canonical members and remain individually adjustable.
Loading, empty, validation, error, keyboard, mobile and unsaved-change states
are part of the workflow contract. The UI must not describe internal project or
evaluation finalisation as KNEC submission.
