import { CambridgeSubjectSyllabusesRedirectPage } from '@/app/plugins/cambridge/pages/CambridgeRedirectPages';

export default function Page(props: Parameters<typeof CambridgeSubjectSyllabusesRedirectPage>[0]) {
    return <CambridgeSubjectSyllabusesRedirectPage {...props} />;
}
