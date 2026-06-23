import { CambridgeSubjectDetailRedirectPage } from '@/app/plugins/cambridge/pages/CambridgeRedirectPages';

export default function Page(props: Parameters<typeof CambridgeSubjectDetailRedirectPage>[0]) {
    return <CambridgeSubjectDetailRedirectPage {...props} />;
}
