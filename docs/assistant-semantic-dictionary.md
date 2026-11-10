# Assistant semantic dictionary integration

Scholaroscope's backend is the sole owner of product interpretation and execution
semantics. The frontend does not maintain a glossary, semantic selector, entity
resolver, or capability gate.

The backend supplies a versioned, bounded semantic selection to each assistant
interpretation, validates provider proposals, resolves records through governed
services, and checks capability semantic dependencies before execution. Safe
diagnostics may include the server-supplied dictionary version, concept keys,
entry count, payload bytes, provider-call count, and existing stage timings; they
remain protected by the backend environment flag and exact diagnostics
permission.

The conversation UI should continue rendering the backend's existing structured
clarification, limitation, error, and result blocks. It must not infer that a
visible level such as Grade 10 is a class, reinterpret a short stream answer,
turn a definition into an available operation, or treat an unsupported operation
as retryable. General educational explanations require no frontend business-tool
state.

The preserved audit snapshot and operational dictionary live in the backend; see
`server/docs/ASSISTANT_SEMANTIC_DICTIONARY.md` there for ownership, reconciliation,
selection, execution gating, limitations, and update workflow. Future public API
changes should update backend contracts and tests first, followed by generated or
read-only frontend types if needed. Do not create a second independent dictionary.
