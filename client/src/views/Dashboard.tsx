import { useAccount, useDisconnect } from 'wagmi';
import { useUserRegistry } from '../hooks/useUserRegistry';

export function DashboardView() {
    const { address } = useAccount();
    const { disconnect } = useDisconnect();
    // Web3Gate already guarantees user is registered, so we can safely use it directly
    const { user } = useUserRegistry();

    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '10px', color: '#666' }}>{address}</span>
                <button onClick={() => disconnect()} style={{ padding: '4px 8px', fontSize: '10px' }}>Disconnect</button>
            </div>
            <h2>🎉 Welcome Back!</h2>
            <h1 style={{ color: '#007bff', margin: '10px 0' }}>{user?.name}</h1>
            <p style={{ color: '#555' }}>You are securely logged into your on-chain profile.</p>
            <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <p>Member Status: <b>Active</b></p>
            </div>
        </div>
    );
}
