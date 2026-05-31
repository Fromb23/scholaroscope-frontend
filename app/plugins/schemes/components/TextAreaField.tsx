import type { TextareaHTMLAttributes } from 'react';

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    helpText?: string;
}

export function TextAreaField({
    label,
    helpText,
    className = '',
    ...props
}: TextAreaFieldProps) {
    return (
        <div>
            {label ? (
                <label className="mb-1 block text-sm font-medium theme-text">
                    {label}
                </label>
            ) : null}
            <textarea
                className={`theme-input min-h-[96px] w-full rounded-lg px-4 py-2 ${className}`}
                {...props}
            />
            {helpText ? (
                <p className="mt-1 text-xs theme-subtle">{helpText}</p>
            ) : null}
        </div>
    );
}
