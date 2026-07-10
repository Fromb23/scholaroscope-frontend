import type { WorkspaceAccessMe } from '@/app/core/types/workspaceAccess';

export function AdminSlotSummary({ access }: { access?: WorkspaceAccessMe }) {
  const slots = access?.admin_slots;
  if (!slots) return null;
  return (
    <div className="rounded-md border theme-border p-4">
      <p className="text-sm font-semibold theme-text">Technical administrator slots</p>
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="theme-subtle text-xs">Maximum</p>
          <p className="font-semibold theme-text">{slots.maximum ?? 'Platform'}</p>
        </div>
        <div>
          <p className="theme-subtle text-xs">Used</p>
          <p className="font-semibold theme-text">{slots.used ?? '-'}</p>
        </div>
        <div>
          <p className="theme-subtle text-xs">Remaining</p>
          <p className="font-semibold theme-text">{slots.remaining ?? '-'}</p>
        </div>
      </div>
      {slots.requires_review ? (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
          This workspace has a legacy administrator count that requires review.
        </p>
      ) : null}
    </div>
  );
}
