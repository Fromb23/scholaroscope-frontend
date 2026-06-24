import { CheckCircle2, Circle } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';

interface ReportPreparingStateProps {
  title: string;
  description?: string;
  steps?: string[];
  activeStep?: number;
}

export function ReportPreparingState({
  title,
  description,
  steps = [],
  activeStep = 0,
}: ReportPreparingStateProps) {
  return (
    <div className="theme-card rounded-lg p-6" role="status" aria-live="polite">
      <div className="flex items-start gap-4">
        <LoadingSpinner fullScreen={false} size="md" />
        <div>
          <h2 className="text-lg font-semibold theme-text">{title}</h2>
          {description ? <p className="mt-1 text-sm theme-muted">{description}</p> : null}
          {steps.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {steps.map((step, index) => {
                const complete = index < activeStep;
                const current = index === activeStep;
                return (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-[color:var(--color-success)]" />
                    ) : (
                      <Circle className={`h-4 w-4 ${current ? 'text-[color:var(--color-primary)]' : 'theme-subtle'}`} />
                    )}
                    <span className={current ? 'font-medium theme-text' : 'theme-muted'}>{step}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  );
}
