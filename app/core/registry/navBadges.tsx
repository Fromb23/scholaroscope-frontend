'use client';

import { createContext, useContext, useState, useCallback, type ComponentType } from 'react';

type Badges = Record<string, number>;
type SetBadge = (key: string, count: number) => void;

const BadgesCtx = createContext<Badges>({});
const SetBadgeCtx = createContext<SetBadge>(() => {});

const _reporters: ComponentType[] = [];

export function registerNavBadgeReporter(reporter: ComponentType): void {
    if (!_reporters.includes(reporter)) _reporters.push(reporter);
}

export function NavBadgeProvider({ children }: { children: React.ReactNode }) {
    const [badges, setBadges] = useState<Badges>({});
    const set = useCallback((key: string, count: number) => {
        setBadges(prev => prev[key] === count ? prev : { ...prev, [key]: count });
    }, []);
    return (
        <SetBadgeCtx.Provider value={set}>
            <BadgesCtx.Provider value={badges}>
                {children}
                <span style={{ display: 'none' }}>
                    {_reporters.map((Reporter, i) => <Reporter key={i} />)}
                </span>
            </BadgesCtx.Provider>
        </SetBadgeCtx.Provider>
    );
}

export const useNavBadges = () => useContext(BadgesCtx);
export const useSetNavBadge = () => useContext(SetBadgeCtx);
