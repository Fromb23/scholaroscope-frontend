import { redirect } from 'next/navigation';

type CambridgeRouteParams<Key extends string> = {
    params: Promise<Record<Key, string>>;
};

export function CambridgeAuthoringIndexRedirectPage() {
    redirect('/cambridge/authoring/programmes');
    return null;
}

export async function CambridgeFrameworkStrandsRedirectPage({
    params,
}: CambridgeRouteParams<'frameworkId'>) {
    const { frameworkId } = await params;
    redirect(`/cambridge/setup/frameworks/${frameworkId}/strands`);
    return null;
}

export async function CambridgeProgrammeSubjectsRedirectPage({
    params,
}: CambridgeRouteParams<'programmeId'>) {
    const { programmeId } = await params;
    redirect(`/cambridge/setup/programmes/${programmeId}/subjects`);
    return null;
}

export async function CambridgeSubjectDetailRedirectPage({
    params,
}: CambridgeRouteParams<'id'>) {
    const { id } = await params;
    redirect(`/cambridge/setup/subjects/${id}`);
    return null;
}

export async function CambridgeSubjectFrameworksRedirectPage({
    params,
}: CambridgeRouteParams<'id'>) {
    const { id } = await params;
    redirect(`/cambridge/setup/subjects/${id}/frameworks`);
    return null;
}

export async function CambridgeSubjectSyllabusesRedirectPage({
    params,
}: CambridgeRouteParams<'id'>) {
    const { id } = await params;
    redirect(`/cambridge/setup/subjects/${id}/syllabuses`);
    return null;
}

export async function CambridgeSyllabusComponentsRedirectPage({
    params,
}: CambridgeRouteParams<'syllabusId'>) {
    const { syllabusId } = await params;
    redirect(`/cambridge/setup/syllabuses/${syllabusId}/components`);
    return null;
}
