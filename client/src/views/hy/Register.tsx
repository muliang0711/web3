import { useState } from 'react';
import { useUserRegistry } from '../../hooks/useUserRegistry';

export function RegisterView() {
    const [name, setName] = useState('');
    const { register, status } = useUserRegistry();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            register(name);
        }
    };

    const isProcessing = status.isRegistering || status.isConfirming;

    return (
        <div className="fade-in text-center">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📝</div>
            <h2>Create Your Account</h2>
            <p style={{ margin: '0.5rem 0 1.75rem' }}>
                Register your identity on-chain to start using the platform.
            </p>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                    className="input"
                    type="text"
                    placeholder="Enter your display name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isProcessing}
                />

                <button
                    className="btn-success"
                    type="submit"
                    disabled={isProcessing || !name.trim()}
                >
                    {isProcessing ? '⏳ Processing...' : '✅ Register'}
                </button>
            </form>

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
