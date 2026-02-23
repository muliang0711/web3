import { useAccount, useDisconnect } from 'wagmi';
import { useUserRegistry } from '../hooks/useUserRegistry';

export function DashboardView() {
    const { address } = useAccount();
    const { disconnect } = useDisconnect();
    const { user } = useUserRegistry();

    return (
        <div className="fade-in">
            {/* Header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button className="btn-ghost" onClick={() => disconnect()}>
                    Disconnect
                </button>
            </div>

            {/* Welcome section */}
            <div className="text-center" style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👋</div>
                <h2>Welcome, {user?.name}</h2>
                <p style={{ marginTop: '0.25rem' }}>Your on-chain identity is verified.</p>
            </div>

            {/* Placeholder — ready for crowdfunding module */}
            <div style={{
                padding: '1.5rem',
                background: 'var(--bg-input)',
                border: '1px dashed var(--border)',
                borderRadius: '12px',
                textAlign: 'center',
            }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    🏗️ Crowdfunding features coming soon
                </p>
            </div>
        </div>
    );
}
