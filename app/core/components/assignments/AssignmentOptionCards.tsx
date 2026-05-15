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
            <div className="text-sm font-medium text-gray-900">{label}</div>
            <div className="space-y-2">
                {options.map((option) => {
                    const checked = value === option.value;

                    return (
                        <label
                            key={option.value}
                            className={[
                                'flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition-colors',
                                checked
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300',
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
                                className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900">{option.label}</div>
                                <p className="text-sm text-gray-500">{option.helper}</p>
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
