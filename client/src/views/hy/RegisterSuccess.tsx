import { useMemo } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { clearRegistrationSuccessState, getRegistrationSuccessState } from '../../lib/registrationSuccess';

export function RegisterSuccessView() {
    const navigate = useNavigate();
    const { address } = useAccount();
    const successState = useMemo(() => getRegistrationSuccessState(), []);

    if (!successState) {
        return <Navigate to="/profile" replace />;
    }

    const displayName = successState.name || 'Member';
    const walletAddress = successState.walletAddress || address || 'Wallet connected';

    return (
        <div className="fade-in text-center">
            <div className="auth-kicker">Registration complete</div>
            <h1>Profile created successfully</h1>
            <p style={{ margin: '0.75rem 0 1.5rem' }}>
                {displayName}, your wallet is now registered and ready to use in the pet treatment workspace.
            </p>

            <div style={{ marginBottom: '1.25rem', padding: '1rem', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registered wallet</p>
                <p style={{ margin: '0.4rem 0 0', fontFamily: 'monospace', fontSize: '0.85rem' }}>{walletAddress}</p>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '16px', background: 'rgba(47, 127, 97, 0.08)', border: '1px solid rgba(47, 127, 97, 0.18)' }}>
                <p style={{ margin: 0, color: 'var(--success)', fontWeight: 700 }}>
                    You can continue to your profile and start using the campaign workspace.
                </p>
            </div>

            <button
                type="button"
                className="btn-success"
                onClick={() => {
                    clearRegistrationSuccessState();
                    navigate('/profile', { replace: true });
                }}
            >
                Continue to profile
            </button>
        </div>
    );
}

