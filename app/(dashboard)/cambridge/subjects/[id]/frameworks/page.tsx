import { CambridgeSubjectFrameworksRedirectPage } from '@/app/plugins/cambridge/pages/CambridgeRedirectPages';

export default function Page(props: Parameters<typeof CambridgeSubjectFrameworksRedirectPage>[0]) {
    return <CambridgeSubjectFrameworksRedirectPage {...props} />;
}
