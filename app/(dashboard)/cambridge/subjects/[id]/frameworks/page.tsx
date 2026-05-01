import { redirect } from 'next/navigation';

export default async function CambridgeSubjectFrameworksRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/cambridge/setup/subjects/${id}/frameworks`);
}
