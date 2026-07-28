import { TeacherContributionStatementDetailPage } from '@/app/core/components/revenue/TeacherContributionStatementDetailPage';

export default async function Page({ params }: { params: Promise<{ statementId: string }> }) {
  const { statementId } = await params;
  return <TeacherContributionStatementDetailPage statementId={statementId} />;
}
