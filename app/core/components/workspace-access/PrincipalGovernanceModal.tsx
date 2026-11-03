import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import Modal from '@/app/components/ui/Modal';
import type { PrincipalGovernance, PrincipalGovernancePayload, WorkspaceStaffAssignment } from '@/app/core/types/workspaceAccess';

interface Props {
  open: boolean;
  governance: PrincipalGovernance | undefined;
  staff: WorkspaceStaffAssignment[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (payload: PrincipalGovernancePayload) => Promise<void>;
}

export function PrincipalGovernanceModal({ open, governance, staff, pending, onClose, onSubmit }: Props) {
  const initialOperation = governance?.current ? 'replace' : 'appoint';
  const [operation, setOperation] = useState<PrincipalGovernancePayload['operation']>(initialOperation);
  const [membershipId, setMembershipId] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => { setOperation(governance?.current ? 'replace' : 'appoint'); setMembershipId(''); setReason(''); }, [governance, open]);
  const selected = useMemo(() => staff.find((person) => String(person.membership_id) === membershipId), [membershipId, staff]);
  const needsMember = operation === 'appoint' || operation === 'replace';
  const canSubmit = reason.trim() && (!needsMember || membershipId);
  const submit = async () => {
    if (!canSubmit) return;
    if (!window.confirm(`Confirm Principal ${operation}? This is an audited governance transition.`)) return;
    try {
      await onSubmit({ operation, reason: reason.trim(), ...(needsMember ? { membership_id: Number(membershipId) } : {}) });
    } catch {
      return;
    }
  };
  const allowed = governance?.allowed_actions;

  return <Modal isOpen={open} onClose={onClose} title={governance?.current ? 'Manage Principal' : 'Appoint Principal'} description="Principal is an independent, permission-bounded oversight responsibility. Existing teaching or administration roles remain separate." size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={!canSubmit || pending}>{pending ? 'Updating governance…' : 'Confirm governance change'}</Button></div>}>
    <div className="space-y-5">
      {governance?.current ? <section className="rounded-md border theme-border p-4"><p className="font-semibold theme-text">{governance.current.user_name}</p><p className="text-sm theme-muted">{governance.current.status} · appointed {new Date(governance.current.appointed_at).toLocaleDateString()}</p><p className="mt-2 text-sm theme-muted">Appointed by {governance.current.appointed_by || 'Recorded authority'}</p><p className="mt-1 text-sm theme-muted">Reason: {governance.current.appointment_reason}</p></section> : <section className="rounded-md bg-blue-500/10 p-4 text-sm theme-text">The appointed person receives only the canonical Principal permission bundle through a protected workspace-wide tenure.</section>}
      <label className="block text-sm"><span className="mb-1 block font-medium theme-text">Governance action</span><select className="theme-input w-full rounded-lg px-3 py-2" value={operation} onChange={(event) => setOperation(event.target.value as PrincipalGovernancePayload['operation'])}>{allowed?.appoint ? <option value="appoint">Appoint</option> : null}{allowed?.replace ? <option value="replace">Replace</option> : null}{allowed?.suspend ? <option value="suspend">Suspend</option> : null}{allowed?.restore ? <option value="restore">Restore</option> : null}{allowed?.end ? <option value="end">End tenure</option> : null}</select></label>
      {needsMember ? <label className="block text-sm"><span className="mb-1 block font-medium theme-text">Active staff member</span><select className="theme-input w-full rounded-lg px-3 py-2" value={membershipId} onChange={(event) => setMembershipId(event.target.value)}><option value="">Select staff member</option>{governance?.candidates.map((candidate) => <option key={candidate.membership_id} value={candidate.membership_id}>{candidate.label} · {candidate.email}</option>)}</select></label> : null}
      {selected ? <div className="rounded-md border theme-border p-3"><p className="text-sm font-medium theme-text">Existing roles</p><div className="mt-2 flex flex-wrap gap-2">{selected.roles.length ? selected.roles.map((role) => <span key={role.assignment_id} className="rounded-full bg-black/5 px-2 py-1 text-xs theme-text">{role.name}</span>) : <span className="text-xs theme-muted">No additional workspace roles</span>}</div></div> : null}
      <Input id="principal-governance-reason" label="Required reason" value={reason} onChange={(event) => setReason(event.target.value)} required placeholder="Record the institutional governance basis" />
      {governance?.history.length ? <details><summary className="cursor-pointer text-sm font-medium theme-text">Governance history</summary><ul className="mt-2 space-y-2">{governance.history.map((item) => <li key={item.id} className="rounded-md border theme-border p-3 text-sm"><span className="font-medium theme-text">{item.user_name}</span><span className="ml-2 theme-muted">{item.status}</span></li>)}</ul></details> : null}
    </div>
  </Modal>;
}
