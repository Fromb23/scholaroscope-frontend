'use client';

export interface AssignmentOptionCardOption<TValue extends string = string> {
    value: TValue;
    label: string;
    helper: string;
    disabled?: boolean;
}

interface AssignmentOptionCardsProps<TValue extends string = string> {
    label: string;
    value: TValue;
    options: Array<AssignmentOptionCardOption<TValue>>;
    onChange: (value: TValue) => void;
}

export function AssignmentOptionCards<TValue extends string = string>({
    label,
    value,
    options,
    onChange,
}: AssignmentOptionCardsProps<TValue>) {
    return (
        <div className="space-y-3">
            <div className="text-sm font-medium theme-text">{label}</div>
            <div className="space-y-2">
                {options.map((option) => {
                    const checked = value === option.value;

                    return (
                        <label
                            key={option.value}
                            className={[
                                'flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors',
                                checked
                                    ? 'theme-info-surface border-[color:var(--color-primary)]'
                                    : 'theme-surface-elevated theme-border theme-hover-surface theme-hover-border-strong',
                                option.disabled ? 'cursor-not-allowed opacity-60' : '',
                            ].join(' ')}
                        >
                            <input
                                type="radio"
                                name={label}
                                value={option.value}
                                checked={checked}
                                disabled={option.disabled}
                                onChange={() => onChange(option.value)}
                                className="theme-checkbox mt-1 h-4 w-4 rounded theme-border"
                            />
                            <div className="min-w-0">
                                <div className="text-sm font-medium theme-text">{option.label}</div>
                                <p className="text-sm theme-muted">{option.helper}</p>
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
