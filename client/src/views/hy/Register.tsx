import { useState } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { clearWalletSession } from '../../lib/walletSession';

export function RegisterView() {
    const [name, setName] = useState('');
    const { address } = useAccount();
    const { disconnect } = useDisconnect();
    const { user, register, status } = useUserRegistry();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            register(name);
        }
    };

    const resetWalletState = async () => {
        try {
            await disconnect();
        } catch (error) {
            console.error('Failed to disconnect wallet cleanly', error);
        }

        clearWalletSession();
        window.location.href = '/login';
    };

    const isProcessing = status.isRegistering || status.isConfirming;
    const isCheckingWallet = !status.hasResolvedUser && status.isReading;

    return (
        <div className="fade-in text-center">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📝</div>
            <h2>Create Your Account</h2>
            <p style={{ margin: '0.5rem 0 1.75rem' }}>
                Register your wallet in the database to start using the platform.
            </p>

            <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Connected wallet</p>
                <p style={{ margin: '0.4rem 0 0', fontFamily: 'monospace', fontSize: '0.85rem' }}>{address || 'No wallet connected'}</p>
            </div>

            {isCheckingWallet && (
                <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Waiting for wallet linking...
                </p>
            )}

            {!isCheckingWallet && user?.isRegistered && (
                <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                    This wallet is already registered. Go back to login and continue to dashboard.
                </p>
            )}

            {!isCheckingWallet && status.userLookupError && (
                <p className="text-danger" style={{ marginBottom: '1rem' }}>
                    ⚠ {status.userLookupError}
                </p>
            )}

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    className="input"
                    type="text"
                    placeholder="Enter your display name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isProcessing || isCheckingWallet || Boolean(user?.isRegistered)}
                />

                <button
                    className="btn-success"
                    type="submit"
                    disabled={isProcessing || isCheckingWallet || !name.trim() || Boolean(user?.isRegistered)}
                >
                    {isProcessing ? '⏳ Processing...' : '✅ Register'}
                </button>
            </form>

            <button
                type="button"
                className="btn-ghost"
                onClick={resetWalletState}
                style={{ marginTop: '1rem' }}
            >
                Disconnect And Switch Wallet
            </button>

            {status.error && (
                <p className="text-danger" style={{ marginTop: '1rem' }}>
                    ⚠ {status.error.message}
                </p>
            )}

            {status.txHash && !status.error && (
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    Tx: {status.txHash}
                </p>
            )}
        </div>
    );
}
