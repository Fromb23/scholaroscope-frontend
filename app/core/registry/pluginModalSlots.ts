import type { ComponentType } from 'react';

export interface PluginModalSlotProps {
    isOpen: boolean;
    onClose: () => void;
}

type PluginModalSlot = ComponentType<PluginModalSlotProps>;

const _slots: Record<string, PluginModalSlot> = {};

export function registerPluginModalSlot(pluginKey: string, component: PluginModalSlot): void {
    if (_slots[pluginKey]) return; // idempotent
    _slots[pluginKey] = component;
}

export function getPluginModalSlot(pluginKey: string): PluginModalSlot | null {
    return _slots[pluginKey] ?? null;
}
