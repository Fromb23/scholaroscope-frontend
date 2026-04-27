import { redirect } from 'next/navigation';

export default async function CambridgeSyllabusComponentsRedirect({
  params,
}: {
  params: Promise<{ syllabusId: string }>;
}) {
  const { syllabusId } = await params;
  redirect(`/cambridge/setup/syllabuses/${syllabusId}/components`);
}
