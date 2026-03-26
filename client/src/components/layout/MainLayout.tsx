import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';

export function MainLayout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { address } = useAccount();
    const { disconnect } = useDisconnect();

    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

    if (isAuthRoute) {
        return (
            <div className="auth-layout fade-in">
                <div className="app-container">{children}</div>
            </div>
        );
    }

    return (
        <div className="app-wrapper fade-in">
            {/* Left Sidebar Navigation */}
            <aside className="sidebar">
                <div className="sidebar-logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.5rem' }}>⛓️</span> Web3 Fund
                </div>

                <div className="sidebar-nav-group">
                    <div className="sidebar-nav-header">User</div>
                    <NavLink to="/profile" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <span style={{ fontSize: '1.2rem' }}>👤</span> My Profile
                    </NavLink>
                    <NavLink to="/user/created-history" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <span style={{ fontSize: '1.2rem' }}>📝</span> My Campaigns
                    </NavLink>
                    <NavLink to="/global-history" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <span style={{ fontSize: '1.2rem' }}>🌍</span> Registrations
                    </NavLink>
                </div>

                <div className="sidebar-nav-group">
                    <div className="sidebar-nav-header">Campaigns</div>
                    <NavLink to="/campaigns" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <span style={{ fontSize: '1.2rem' }}>📋</span> Browse
                    </NavLink>
                    <NavLink to="/campaigns/create" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <span style={{ fontSize: '1.2rem' }}>➕</span> Create
                    </NavLink>
                </div>

                <div className="sidebar-nav-group" style={{ flex: 1 }}>
                    <div className="sidebar-nav-header">Transactions</div>
                    <NavLink to="/transactions/user" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        <span style={{ fontSize: '1.2rem' }}>📊</span> Explorer
                    </NavLink>
                </div>

                <div className="sidebar-footer">
                    <button
                        className="sidebar-logout-btn"
                        onClick={() => { disconnect(); navigate('/login'); }}
                        title="Disconnect wallet and log out"
                    >
                        <span style={{ fontSize: '1.1rem' }}>🚪</span> Disconnect
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                {/* Top Bar */}
                <header className="top-bar">
                    <div className="top-bar-badge">
                        ✅ Your on-chain identity is verified
                    </div>
                    <div className="user-profile-widget">
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                        </span>
                        <div className="user-avatar" onClick={() => navigate('/profile')} title="Profile">
                            {address?.slice(2, 4)?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </header>

                <div className="dashboard-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
