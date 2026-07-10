import type { WorkspacePermissionDefinition } from '@/app/core/types/workspaceAccess';

interface PermissionMatrixProps {
  permissions: WorkspacePermissionDefinition[];
  selected: string[];
  onToggle: (key: string) => void;
  readonly?: boolean;
}

export function PermissionMatrix({ permissions, selected, onToggle, readonly = false }: PermissionMatrixProps) {
  const groups = permissions.reduce<Record<string, WorkspacePermissionDefinition[]>>((acc, permission) => {
    acc[permission.subsystem] = [...(acc[permission.subsystem] ?? []), permission];
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([subsystem, items]) => (
        <div key={subsystem} className="rounded-md border theme-border p-4">
          <p className="mb-3 text-sm font-semibold capitalize theme-text">{subsystem}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {items.map((permission) => {
              const disabled = readonly || !permission.actor_can_delegate || !permission.is_delegable;
              return (
                <label
                  key={permission.key}
                  className={`rounded-md border p-3 text-sm ${
                    selected.includes(permission.key) ? 'border-blue-500 bg-blue-500/10' : 'theme-border'
                  } ${disabled ? 'opacity-60' : 'theme-hover-surface'}`}
                >
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(permission.key)}
                      disabled={disabled}
                      onChange={() => onToggle(permission.key)}
                    />
                    <div>
                      <p className="font-medium theme-text">{permission.name}</p>
                      <p className="theme-subtle text-xs">{permission.key}</p>
                      <p className="theme-muted mt-1 text-xs">{permission.description}</p>
                      <p className="theme-subtle mt-1 text-xs">
                        {permission.risk_level}
                        {permission.supports_scope ? ` · scoped: ${permission.allowed_scope_types.join(', ')}` : ''}
                        {!permission.is_delegable ? ' · not delegable' : ''}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
