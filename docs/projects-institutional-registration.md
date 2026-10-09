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
