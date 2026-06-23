import { CambridgeProgrammeSubjectsRedirectPage } from '@/app/plugins/cambridge/pages/CambridgeRedirectPages';

export default function Page(props: Parameters<typeof CambridgeProgrammeSubjectsRedirectPage>[0]) {
    return <CambridgeProgrammeSubjectsRedirectPage {...props} />;
}
