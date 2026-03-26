import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';

const USER_REGISTRY_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export function GlobalHistoryView() {
    const publicClient = usePublicClient();
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!publicClient) return;

        const fetchData = async () => {
            try {
                const registrationLogs = await publicClient.getLogs({
                    address: USER_REGISTRY_ADDR as `0x${string}`,
                    event: parseAbiItem('event UserRegistered(address indexed userAddress, string username, uint256 timestamp)'),
                    fromBlock: 0n,
                    toBlock: 'latest'
                });
                setRegistrations(registrationLogs.reverse());
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 4000);
        return () => clearInterval(interval);
    }, [publicClient]);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Live Registrations</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time view of all users joining the platform</p>
            </div>

            {isLoading ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading registrations...</p>
                </div>
            ) : registrations.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    No users registered yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {registrations.map((log, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                {log.args.username?.slice(0, 1)?.toUpperCase() || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>{log.args.username}</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{log.args.userAddress}</p>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                                {new Date(Number(log.args.timestamp) * 1000).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
