import { useAccount, useDisconnect } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useUserRegistry } from '../../hooks/useUserRegistry';

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

            {/* ===== User Module (hy) ===== */}
            <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                    👤 User
                </p>
                <div className="nav-grid-3">
                    <button className="nav-card" onClick={() => navigate('/profile')}>
                        <span className="nav-card-icon">👤</span>
                        <span className="nav-card-title">My Profile</span>
                        <span className="nav-card-desc">Points & history</span>
                    </button>
                    <button className="nav-card" onClick={() => navigate('/user/created-history')}>
                        <span className="nav-card-icon">📝</span>
                        <span className="nav-card-title">My Campaigns</span>
                        <span className="nav-card-desc">Created history</span>
                    </button>
                    <button className="nav-card" onClick={() => navigate('/global-history')}>
                        <span className="nav-card-icon">🌍</span>
                        <span className="nav-card-title">Registrations</span>
                        <span className="nav-card-desc">User sign-ups</span>
                    </button>
                </div>
            </div>

            {/* ===== Campaign Module (cyao) ===== */}
            <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                    📋 Campaigns
                </p>
                <div className="nav-grid-3">
                    <button className="nav-card" onClick={() => navigate('/campaigns')}>
                        <span className="nav-card-icon">📋</span>
                        <span className="nav-card-title">Browse</span>
                        <span className="nav-card-desc">All campaigns</span>
                    </button>
                    <button className="nav-card" onClick={() => navigate('/campaigns/create')}>
                        <span className="nav-card-icon">➕</span>
                        <span className="nav-card-title">Create</span>
                        <span className="nav-card-desc">New campaign</span>
                    </button>
                    <button className="nav-card" onClick={() => navigate('/campaigns/history')}>
                        <span className="nav-card-icon">📜</span>
                        <span className="nav-card-title">History</span>
                        <span className="nav-card-desc">Campaign log</span>
                    </button>
                </div>
            </div>

            {/* ===== Donation Module (ny) ===== */}
            <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                    💰 Donations
                </p>
                <div className="nav-grid-3">
                    <button className="nav-card" onClick={() => navigate('/donate')}>
                        <span className="nav-card-icon">💰</span>
                        <span className="nav-card-title">Donate</span>
                        <span className="nav-card-desc">Fund a campaign</span>
                    </button>
                    <button className="nav-card" onClick={() => navigate('/donation-success')}>
                        <span className="nav-card-icon">✅</span>
                        <span className="nav-card-title">Success</span>
                        <span className="nav-card-desc">Donation result</span>
                    </button>
                    <button className="nav-card" onClick={() => navigate('/refund-history')}>
                        <span className="nav-card-icon">🔄</span>
                        <span className="nav-card-title">Refunds</span>
                        <span className="nav-card-desc">Refund history</span>
                    </button>
                </div>
            </div>

            {/* ===== Transaction Module (ccy) ===== */}
            <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                    📊 Transactions
                </p>
                <div className="nav-grid-3">
                    <button className="nav-card" onClick={() => navigate('/transactions/user')}>
                        <span className="nav-card-icon">📊</span>
                        <span className="nav-card-title">Explorer</span>
                        <span className="nav-card-desc">All donations</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
