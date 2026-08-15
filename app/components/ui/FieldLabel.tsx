import type { LabelHTMLAttributes, ReactNode } from 'react';

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  optional?: boolean | string;
}

export function RequiredMarker() {
  return (
    <>
      <span aria-hidden="true" className="text-red-500">
        *
      </span>
      <span className="sr-only"> required</span>
    </>
  );
}

export function FieldLabel({
  children,
  required = false,
  optional = false,
  className = 'mb-1 flex items-center gap-1 text-sm font-medium theme-text',
  ...props
}: FieldLabelProps) {
  const optionalLabel = typeof optional === 'string' ? optional : 'Optional';

  return (
    <label className={className} {...props}>
      <span>{children}</span>
      {required ? (
        <RequiredMarker />
      ) : optional ? (
        <span className="ml-1 theme-subtle text-xs font-normal">{optionalLabel}</span>
      ) : null}
    </label>
  );
}
