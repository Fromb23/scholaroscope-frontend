// ============================================================================
// app/plugins/cambridge/registry/providerExtension.tsx
//
// Registers CambridgeProvider into the plugin provider registry.
// Core must compose registered providers above plugin consumers.
// ============================================================================

import { registerPluginProvider } from '@/app/core/registry/pluginProviderRegistry';
import { CambridgeProvider } from '@/app/plugins/cambridge/context/CambridgeContext';

registerPluginProvider('cambridge', CambridgeProvider);
