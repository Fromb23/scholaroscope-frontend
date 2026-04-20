import { registerPluginProvider } from '@/app/core/registry/pluginProviderRegistry';
import { CBCProvider } from '@/app/plugins/cbc/context/CBCContext';

registerPluginProvider('cbc', CBCProvider);
