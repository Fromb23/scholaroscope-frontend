# AI request efficiency

Lesson-plan and scheme generation continue to use the backend's durable
generation jobs and ordinary HTTP status endpoint. The client does not create a
second job store, infer completion, or add a streaming transport.

Both generation pages use the shared bounded polling helper. It:

- returns an already terminal generation response without a status request;
- polls queued work after one second and processing work after 1.5 seconds;
- stops at completed, failed, superseded or cancelled states;
- passes an `AbortSignal` through the typed API adapter; and
- clears its timer and prevents stale state updates when navigation, remount or
  workspace teardown aborts the owning component.

Cancellation stops client observation only. The backend job remains durable and
authoritative. The institutional assistant retains its more specialized per-run
polling because it also projects turn attempts, diagnostics, progressive text
and conversation title updates; it already coalesces one loop per run and aborts
all work at workspace/conversation boundaries.

The deterministic client fixture confirms zero GETs for a completed initial
response, a 1.5 second processing interval and zero requests after cancellation.
See the backend `docs/ai-execution-efficiency.md` for the complete execution-path
audit, prompt measurement, reuse rules and recovery policy.
