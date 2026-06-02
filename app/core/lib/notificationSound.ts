export type NotificationSoundKind = 'normal' | 'session';
export type NotificationSoundKey = string;

const STORAGE_KEY = 'scholaroscope_notification_sound_ids';
const MAX_STORED_IDS = 200;

type BrowserWindow = Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
};

let initialized = false;
let unlockListenersAttached = false;
let audioContext: AudioContext | null = null;
let soundedKeys = new Set<NotificationSoundKey>();
let pendingKeys = new Set<NotificationSoundKey>();
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

function normalizeStoredSoundKey(value: unknown): NotificationSoundKey | null {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }

    return null;
}

function trimStoredKeys(keys: NotificationSoundKey[]): NotificationSoundKey[] {
    return keys.slice(-MAX_STORED_IDS);
}

function hydrateSoundedKeys(): void {
    if (typeof window === 'undefined' || soundedKeys.size > 0) {
        return;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return;

        soundedKeys = new Set(
            parsed
                .map((value) => normalizeStoredSoundKey(value))
                .filter((value): value is NotificationSoundKey => value !== null)
        );
    } catch {
        soundedKeys = new Set<NotificationSoundKey>();
    }
}

function persistSoundedKeys(): void {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(trimStoredKeys(Array.from(soundedKeys)))
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

function markKeysAsSounded(keys: NotificationSoundKey[]): void {
    keys.forEach((key) => soundedKeys.add(key));

    if (soundedKeys.size > MAX_STORED_IDS) {
        soundedKeys = new Set(trimStoredKeys(Array.from(soundedKeys)));
    }

    persistSoundedKeys();
}

function flushPending(): void {
    if (!pendingKind || pendingKeys.size === 0) {
        return;
    }

    if (!playSound(pendingKind)) {
        return;
    }

    const keys = Array.from(pendingKeys);
    markKeysAsSounded(keys);
    pendingKeys = new Set<NotificationSoundKey>();
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

    hydrateSoundedKeys();
    attachUnlockListeners();
    initialized = true;
}

export function queueNotificationSound(kind: NotificationSoundKind, keys: NotificationSoundKey[]): void {
    initializeNotificationSound();
    hydrateSoundedKeys();

    const nextKeys = keys.filter((key) => !soundedKeys.has(key) && !pendingKeys.has(key));
    if (nextKeys.length === 0) {
        return;
    }

    nextKeys.forEach((key) => pendingKeys.add(key));
    pendingKind = pendingKind === 'session' || kind === 'session' ? 'session' : 'normal';

    if (typeof navigator !== 'undefined' && navigator.userActivation?.hasBeenActive) {
        void unlockAudio();
        return;
    }

    flushPending();
}
