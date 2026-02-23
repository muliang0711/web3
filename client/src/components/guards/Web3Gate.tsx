import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUserRegistry } from '../../hooks/useUserRegistry';

export function Web3Gate() {
    const { isConnected } = useAccount();
    const { user, status } = useUserRegistry();
    const location = useLocation();

    // 1. Not connected -> Redirect to login
    if (!isConnected) {
        if (location.pathname === '/login') return <Outlet />;
        return <Navigate to="/login" replace />;
    }

    // 2. Data is loading -> Show loader
    if (status.isReading) {
        return (
            <div className="text-center fade-in" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Syncing with blockchain…</p>
            </div>
        );
    }

    // 3. Connected but not registered -> Redirect to register
    if (!user || !user.isRegistered) {
        if (location.pathname === '/register') return <Outlet />;
        return <Navigate to="/register" replace />;
    }

    // 4. Registered but trying to access login/register -> Redirect to dashboard
    if (location.pathname === '/login' || location.pathname === '/register') {
        return <Navigate to="/dashboard" replace />;
    }

    // 5. All clear -> Pass through to nested routes
    return <Outlet />;
}
