import { CambridgeFrameworkStrandsRedirectPage } from '@/app/plugins/cambridge/pages/CambridgeRedirectPages';

export default function Page(props: Parameters<typeof CambridgeFrameworkStrandsRedirectPage>[0]) {
    return <CambridgeFrameworkStrandsRedirectPage {...props} />;
}
