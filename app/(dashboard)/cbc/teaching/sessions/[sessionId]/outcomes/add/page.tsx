import { redirect } from 'next/navigation';

export default function Page({
    params,
}: {
    params: { sessionId: string };
}) {
    redirect(`/sessions/${params.sessionId}`);
}
