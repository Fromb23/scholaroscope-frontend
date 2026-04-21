'use client';

import { createContext, useContext } from 'react';

type SlotMap = Record<string, React.ReactNode>;

const SlotContext = createContext<SlotMap>({});

// Imperative registry — plugins call registerSlotContent() as a side effect.
// Core never imports plugins; plugins import core to register themselves.
const _registry: SlotMap = {};

export function registerSlotContent(name: string, content: React.ReactNode): void {
    _registry[name] = content;
}

// Mount once above all Slot consumers (e.g. in dashboard layout).
// Reads from the imperative registry so core never needs to import plugin code.
export function RegistrySlotProvider({ children }: { children: React.ReactNode }) {
    return (
        <SlotContext.Provider value={_registry}>
            {children}
        </SlotContext.Provider>
    );
}

// Explicit provider for cases where the caller owns the slot map directly.
export function SlotProvider({
    slots,
    children,
}: {
    slots: SlotMap;
    children: React.ReactNode;
}) {
    return <SlotContext.Provider value={slots}>{children}</SlotContext.Provider>;
}

export function Slot({
    name,
    children,
}: {
    name: string;
    children?: React.ReactNode;
}) {
    const slots = useContext(SlotContext);
    return <>{slots[name] ?? children ?? null}</>;
}
