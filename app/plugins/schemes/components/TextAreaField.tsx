import type { TextareaHTMLAttributes } from 'react';
import { FieldLabel } from '@/app/components/ui/FieldLabel';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    helpText?: string;
}

export function TextAreaField({
    label,
    helpText,
    className = '',
    required,
    ...props
}: TextAreaFieldProps) {
    return (
        <div>
            {label ? (
                <FieldLabel required={required} className="mb-1 flex items-center gap-1 text-sm font-medium theme-text">
                    {label}
                </FieldLabel>
            ) : null}
            <textarea
                required={required}
                className={`theme-input min-h-[96px] w-full rounded-lg px-4 py-2 ${className}`}
                {...props}
            />
            {helpText ? (
                <p className="mt-1 text-xs theme-subtle">{helpText}</p>
            ) : null}
        </div>
    );
}
