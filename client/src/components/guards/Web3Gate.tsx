import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUserRegistry } from '../../hooks/useUserRegistry';

export function Web3Gate() {
    const { isConnected } = useAccount();
    const { user, status } = useUserRegistry();
    const location = useLocation();

    if (location.pathname === '/login' || location.pathname === '/register') {
        if (isConnected && status.hasResolvedUser && user?.isRegistered) {
            return <Navigate to="/dashboard" replace />;
        }
        return <Outlet />;
    }

    if (!isConnected) {
        return <Navigate to="/login" replace />;
    }

    if (!status.hasResolvedUser && status.isReading) {
        return (
            <div className="text-center fade-in" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Syncing with database...</p>
            </div>
        );
    }

    if (!user || !user.isRegistered) {
        return <Navigate to="/register" replace />;
    }

    return <Outlet />;
}
