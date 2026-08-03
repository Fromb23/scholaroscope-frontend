import { TeacherContributionStatementDetailPage } from '@/app/core/components/revenue/TeacherContributionStatementDetailPage';

export default function Page({ params }: { params: { statementId: string } }) {
  return <TeacherContributionStatementDetailPage statementId={params.statementId} />;
}
