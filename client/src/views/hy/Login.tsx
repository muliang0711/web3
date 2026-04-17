import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { clearWalletSession } from '../../lib/walletSession';

export function LoginView() {
    const navigate = useNavigate();
    const { address, isConnected, status: accountStatus } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { user, status } = useUserRegistry();

    const resetWalletState = async () => {
        try {
            await disconnect();
        } catch (error) {
            console.error('Failed to disconnect wallet cleanly', error);
        }

        clearWalletSession();
        window.location.href = '/login';
    };

    const isCheckingWallet =
        accountStatus === 'connecting' ||
        accountStatus === 'reconnecting' ||
        (isConnected && !status.hasResolvedUser);
    const isRegistered = Boolean(user?.isRegistered);

    useEffect(() => {
        if (isConnected && status.hasResolvedUser && isRegistered) {
            navigate('/profile', { replace: true });
        }
    }, [isConnected, isRegistered, navigate, status.hasResolvedUser]);

    return (
        <div className="fade-in text-center">
            <div className="auth-kicker">Member access</div>
            <h1>Open the pet treatment campaign portal</h1>
            <p style={{ margin: '0.75rem 0 2rem' }}>
                Connect your wallet to review the campaign, participate, and manage reward claims in one calm workspace.
            </p>

            {!isConnected && (
                <>
                    <button
                        className="btn-primary"
                        onClick={() => connect({ connector: injected() })}
                    >
                        Connect wallet
                    </button>

                    <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Connect your MetaMask wallet to get started
                    </p>
                </>
            )}

            {isConnected && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current wallet</p>
                    <p style={{ margin: '0.4rem 0 0', fontFamily: 'monospace', fontSize: '0.85rem' }}>{address}</p>

                    {isCheckingWallet && (
                        <p style={{ marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Waiting for wallet linking...
                        </p>
                    )}

                    {!isCheckingWallet && status.userLookupError && (
                        <p className="text-danger" style={{ marginTop: '0.9rem' }}>
                            {status.userLookupError}
                        </p>
                    )}

                    {!isCheckingWallet && isRegistered && (
                        <>
                            <p style={{ marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--success)' }}>
                                Wallet recognized. Redirecting to profile...
                            </p>
                            <button
                                type="button"
                                className="btn-success"
                                onClick={() => navigate('/profile')}
                                style={{ marginTop: '0.9rem' }}
                            >
                                Open Profile
                            </button>
                        </>
                    )}

                    {!isCheckingWallet && !isRegistered && (
                        <>
                            <p style={{ marginTop: '0.9rem', fontSize: '0.85rem', color: 'var(--warning, #f39c12)' }}>
                                This wallet is connected, but you did not register yet.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className="btn-success"
                                    onClick={() => navigate('/register')}
                                >
                                    Register This Wallet
                                </button>
                                <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={resetWalletState}
                                >
                                    Reset Wallet Session
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
