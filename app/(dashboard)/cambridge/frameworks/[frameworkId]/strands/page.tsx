import { redirect } from 'next/navigation';

export default async function CambridgeFrameworkStrandsRedirect({
  params,
}: {
  params: Promise<{ frameworkId: string }>;
}) {
  const { frameworkId } = await params;
  redirect(`/cambridge/setup/frameworks/${frameworkId}/strands`);
}
