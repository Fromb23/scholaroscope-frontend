import { CBCOutcomeAddRedirectPage } from '@/app/plugins/cbc/pages/CBCRedirectPages';

export default function Page(props: Parameters<typeof CBCOutcomeAddRedirectPage>[0]) {
    return <CBCOutcomeAddRedirectPage {...props} />;
}
