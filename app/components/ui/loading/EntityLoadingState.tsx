import { SectionLoading } from './SectionLoading';

interface EntityLoadingStateProps {
  entity: string;
  name?: string | null;
  action: string;
  className?: string;
}

function possessive(value: string) {
  return value.endsWith('s') ? `${value}'` : `${value}'s`;
}

export function EntityLoadingState({
  entity,
  name,
  action,
  className,
}: EntityLoadingStateProps) {
  const subject = name ? `${possessive(name)} ${entity}` : entity;
  return <SectionLoading title={`${action} ${subject}...`} className={className} />;
}
