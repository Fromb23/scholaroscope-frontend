import { getPluginProvider } from '@/app/core/registry/pluginProviderRegistry';
import '@/app/plugins/cbc/registry/learnerExtension';

export default function CBCLayout({ children }: { children: React.ReactNode }) {
    const Provider = getPluginProvider('cbc');
    const inner = <div className="max-w-7xl mx-auto space-y-6">{children}</div>;
    return Provider ? <Provider>{inner}</Provider> : inner;
}
