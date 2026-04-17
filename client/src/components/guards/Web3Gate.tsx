import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useUserRegistry } from '../../hooks/useUserRegistry';

function GateLoader({ message }: { message: string }) {
    return (
        <div className="text-center fade-in" style={{ padding: '3rem 0' }}>
            <div className="spinner" />
            <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>{message}</p>
        </div>
    );
}

export function Web3Gate() {
    const { isConnected, status: accountStatus } = useAccount();
    const { user, status } = useUserRegistry();
    const location = useLocation();
    const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
    const isHydratingWallet = accountStatus === 'connecting' || accountStatus === 'reconnecting';
    const isHydratingUser = isConnected && !status.hasResolvedUser;

    if (isAuthRoute) {
        if (isHydratingWallet || isHydratingUser) {
            return <GateLoader message="Restoring your wallet session..." />;
        }

        if (isConnected && user?.isRegistered) {
            return <Navigate to="/profile" replace />;
        }

        return <Outlet />;
    }

    if (isHydratingWallet) {
        return <GateLoader message="Restoring your wallet session..." />;
    }

    if (!isConnected) {
        return <Navigate to="/login" replace />;
    }

    if (isHydratingUser) {
        return <GateLoader message="Syncing your profile..." />;
    }

    if (!user || !user.isRegistered) {
        return <Navigate to="/register" replace />;
    }

    return <Outlet />;
}
