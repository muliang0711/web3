import type { ReactNode } from 'react';
import { useLocation, NavLink, useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';

export function MainLayout({ children }: { children: ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { address } = useAccount();
    const { disconnect } = useDisconnect();

    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
    const isPublicRoute = location.pathname === '/';

    if (isPublicRoute) {
        return <div className="marketing-layout fade-in">{children}</div>;
    }

    if (isAuthRoute) {
        return (
            <div className="auth-layout fade-in">
                <div className="auth-backdrop" aria-hidden="true" />
                <div className="auth-shell">
                    <button type="button" className="auth-home-link" onClick={() => navigate('/')}>
                        Back to campaign
                    </button>
                    <div className="app-container">{children}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-wrapper fade-in">
            <aside className="sidebar">
                <button type="button" className="sidebar-logo" onClick={() => navigate('/dashboard')}>
                    <span className="sidebar-logo-mark">PT</span>
                    <span>
                        <strong>Pet Treatment</strong>
                        <small>Campaign workspace</small>
                    </span>
                </button>

                <div className="sidebar-nav-group">
                    <div className="sidebar-nav-header">Member</div>
                    <NavLink to="/profile" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        Profile
                    </NavLink>
                    <NavLink to="/user/created-history" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        Created campaigns
                    </NavLink>
                    <NavLink to="/global-history" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        Registry log
                    </NavLink>
                </div>

                <div className="sidebar-nav-group">
                    <div className="sidebar-nav-header">Campaign</div>
                    <NavLink to="/campaigns" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        Browse campaigns
                    </NavLink>
                    <NavLink to="/campaigns/create" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        Create campaign
                    </NavLink>
                </div>

                <div className="sidebar-nav-group" style={{ flex: 1 }}>
                    <div className="sidebar-nav-header">Records</div>
                    <NavLink to="/transactions/user" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                        Transactions
                    </NavLink>
                </div>

                <div className="sidebar-footer">
                    <button
                        className="sidebar-logout-btn"
                        onClick={() => {
                            disconnect();
                            navigate('/login');
                        }}
                        title="Disconnect wallet and log out"
                    >
                        Disconnect wallet
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="top-bar">
                    <div className="top-bar-badge">Pet treatment support workspace</div>
                    <div className="user-profile-widget">
                        <span className="wallet-pill">
                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                        </span>
                        <button type="button" className="user-avatar" onClick={() => navigate('/profile')} title="Open profile">
                            {address?.slice(2, 4)?.toUpperCase() || 'PT'}
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">{children}</div>
            </main>
        </div>
    );
}
