import { CambridgeSyllabusComponentsRedirectPage } from '@/app/plugins/cambridge/pages/CambridgeRedirectPages';

export default function Page(props: Parameters<typeof CambridgeSyllabusComponentsRedirectPage>[0]) {
    return <CambridgeSyllabusComponentsRedirectPage {...props} />;
}
