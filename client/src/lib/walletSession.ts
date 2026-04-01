export function clearWalletSession() {
    if (typeof window === 'undefined') return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('wagmi')) {
            keysToRemove.push(key);
        }
    }

    for (const key of keysToRemove) {
        window.localStorage.removeItem(key);
    }
}
