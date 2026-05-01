import { redirect } from 'next/navigation';

export default async function CambridgeSubjectDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/cambridge/setup/subjects/${id}`);
}
