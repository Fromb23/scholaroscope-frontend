import { redirect } from 'next/navigation';

export default async function CambridgeProgrammeSubjectsRedirect({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  redirect(`/cambridge/setup/programmes/${programmeId}/subjects`);
}
