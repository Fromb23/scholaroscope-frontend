import { redirect } from 'next/navigation';

export function CBCOutcomeAddRedirectPage({
    params,
}: {
    params: { sessionId: string };
}) {
    redirect(`/sessions/${params.sessionId}`);
    return null;
}
