import type { ComponentType } from 'react';

export interface PluginModalSlotProps {
    isOpen: boolean;
    onClose: () => void;
}

type PluginModalSlot = ComponentType<PluginModalSlotProps>;

export const pluginModalSlots: Record<string, PluginModalSlot> = {};

export function registerPluginModalSlot(pluginKey: string, component: PluginModalSlot): void {
    if (pluginModalSlots[pluginKey]) return; // idempotent
    pluginModalSlots[pluginKey] = component;
}

export function getPluginModalSlot(pluginKey: string): PluginModalSlot | null {
    return pluginModalSlots[pluginKey] ?? null;
}
