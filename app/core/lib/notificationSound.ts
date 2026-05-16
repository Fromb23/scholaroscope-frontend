export type NotificationSoundKind = 'normal' | 'session';

const STORAGE_KEY = 'scholaroscope_notification_sound_ids';
const MAX_STORED_IDS = 200;

type BrowserWindow = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

let initialized = false;
let unlockListenersAttached = false;
let audioContext: AudioContext | null = null;
let soundedIds = new Set<number>();
let pendingIds = new Set<number>();
let pendingKind: NotificationSoundKind | null = null;
const unlockAudioHandler = () => {
    void unlockAudio();
};

function getBrowserWindow(): BrowserWindow | null {
    if (typeof window === 'undefined') return null;
    return window as BrowserWindow;
}

function getAudioContextConstructor() {
    const browserWindow = getBrowserWindow();
    return browserWindow?.AudioContext ?? browserWindow?.webkitAudioContext ?? null;
}

function trimStoredIds(ids: number[]): number[] {
    return ids.slice(-MAX_STORED_IDS);
}

function hydrateSoundedIds(): void {
    if (typeof window === 'undefined' || soundedIds.size > 0) {
        return;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return;

        soundedIds = new Set(
            parsed
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value))
        );
    } catch {
        soundedIds = new Set<number>();
    }
}

function persistSoundedIds(): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(trimStoredIds(Array.from(soundedIds)))
        );
    } catch {
        // Ignore storage failures and keep in-memory tracking.
    }
}

function scheduleTone(
    context: AudioContext,
    frequency: number,
    startAt: number,
    duration: number,
    peakGain: number
): void {
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(peakGain, startAt + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
}

function playSound(kind: NotificationSoundKind): boolean {
    if (!audioContext || audioContext.state !== 'running') {
        return false;
    }

    const startAt = audioContext.currentTime + 0.02;
    const tones = kind === 'session'
        ? [
            { delay: 0, frequency: 740, duration: 0.08 },
            { delay: 0.14, frequency: 620, duration: 0.08 },
        ]
        : [{ delay: 0, frequency: 680, duration: 0.1 }];

    tones.forEach((tone) => {
        scheduleTone(audioContext!, tone.frequency, startAt + tone.delay, tone.duration, 0.025);
    });

    return true;
}

function markIdsAsSounded(ids: number[]): void {
    ids.forEach((id) => soundedIds.add(id));

    if (soundedIds.size > MAX_STORED_IDS) {
        soundedIds = new Set(trimStoredIds(Array.from(soundedIds)));
    }

    persistSoundedIds();
}

function flushPending(): void {
    if (!pendingKind || pendingIds.size === 0) {
        return;
    }

    if (!playSound(pendingKind)) {
        return;
    }

    const ids = Array.from(pendingIds);
    markIdsAsSounded(ids);
    pendingIds = new Set<number>();
    pendingKind = null;
}

async function unlockAudio(): Promise<void> {
    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) return;

    try {
        if (!audioContext) {
            audioContext = new AudioContextCtor();
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (audioContext.state === 'running') {
            detachUnlockListeners();
            flushPending();
        }
    } catch {
        // Ignore blocked or unavailable audio contexts.
    }
}

function attachUnlockListeners(): void {
    if (typeof window === 'undefined' || unlockListenersAttached) {
        return;
    }

    window.addEventListener('pointerdown', unlockAudioHandler, { passive: true });
    window.addEventListener('keydown', unlockAudioHandler, { passive: true });
    window.addEventListener('touchstart', unlockAudioHandler, { passive: true });

    unlockListenersAttached = true;
}

function detachUnlockListeners(): void {
    if (typeof window === 'undefined' || !unlockListenersAttached) {
        return;
    }

    window.removeEventListener('pointerdown', unlockAudioHandler);
    window.removeEventListener('keydown', unlockAudioHandler);
    window.removeEventListener('touchstart', unlockAudioHandler);
    unlockListenersAttached = false;
}

export function initializeNotificationSound(): void {
    if (initialized) return;

    hydrateSoundedIds();
    attachUnlockListeners();
    initialized = true;
}

export function queueNotificationSound(kind: NotificationSoundKind, ids: number[]): void {
    initializeNotificationSound();
    hydrateSoundedIds();

    const nextIds = ids.filter((id) => !soundedIds.has(id) && !pendingIds.has(id));
    if (nextIds.length === 0) {
        return;
    }

    nextIds.forEach((id) => pendingIds.add(id));
    pendingKind = pendingKind === 'session' || kind === 'session' ? 'session' : 'normal';

    if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
        void unlockAudio();
        return;
    }

    flushPending();
}
