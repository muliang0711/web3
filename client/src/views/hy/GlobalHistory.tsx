import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { parseAbiItem } from 'viem';

const USER_REGISTRY_ADDR = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export function GlobalHistoryView() {
    const publicClient = usePublicClient();
    const navigate = useNavigate();
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
            <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🌍</div>
                <h2>Live Registrations</h2>
                <p style={{ marginTop: '0.25rem' }}>Real-time view of users joining the platform</p>
            </div>

            {isLoading ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading...</p>
                </div>
            ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                    <div className="history-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {registrations.length === 0 ? (
                            <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No users registered yet.</p>
                        ) : (
                            registrations.map((log, i) => (
                                <div key={i} className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <div className="history-item-icon">🙋</div>
                                    <div className="history-item-content">
                                        <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                            <strong>{log.args.username}</strong> registered at {new Date(Number(log.args.timestamp) * 1000).toLocaleString()}.
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
