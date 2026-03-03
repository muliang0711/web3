import { useAccount, useDisconnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useUserRegistry } from '../hooks/useUserRegistry';

export function DashboardView() {
    const { address } = useAccount();
    const { disconnect } = useDisconnect();
    const { user } = useUserRegistry();
    const navigate = useNavigate();

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

            {/* Navigation Grid */}
            <div className="nav-grid">
                <button className="nav-card" onClick={() => navigate('/profile')}>
                    <span className="nav-card-icon">👤</span>
                    <span className="nav-card-title">My Profile</span>
                    <span className="nav-card-desc">Points & donation history</span>
                </button>

                <button className="nav-card" onClick={() => navigate('/campaigns')}>
                    <span className="nav-card-icon">📋</span>
                    <span className="nav-card-title">Campaigns</span>
                    <span className="nav-card-desc">Browse & create campaigns</span>
                </button>
            </div>
        </div>
    );
}
