import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { formatEther, parseAbiItem } from 'viem';

export function GlobalHistoryView() {
    const publicClient = usePublicClient();
    const navigate = useNavigate();
    
    // We define generic types or cast to any for quick integration with viem logs
    const [donations, setDonations] = useState<any[]>([]);
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!publicClient) return;

        const fetchData = async () => {
            try {
                // Fetch Donation events
                const donationLogs = await publicClient.getLogs({
                    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
                    event: parseAbiItem('event DonationRecorded(address indexed user, address indexed campaign, uint256 amount, uint256 timestamp)'),
                    fromBlock: 0n,
                    toBlock: 'latest'
                });
                
                // Fetch Registration events
                const registrationLogs = await publicClient.getLogs({
                    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
                    event: parseAbiItem('event UserRegistered(address indexed userAddress, string username, uint256 timestamp)'),
                    fromBlock: 0n,
                    toBlock: 'latest'
                });

                setDonations(donationLogs.reverse());
                setRegistrations(registrationLogs.reverse());
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        // Set up real-time polling to simulate "real-time" feel requested by user
        const interval = setInterval(fetchData, 4000);
        return () => clearInterval(interval);
    }, [publicClient]);

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
            <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>🌍 Global Platform History</h2>
            
            {isLoading ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading global history...</p>
                </div>
            ) : (
                <div className="nav-grid-3" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>💰 Live Donations</h3>
                        <div className="history-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {donations.length === 0 ? <p className="text-muted" style={{textAlign: 'center', padding: '1rem'}}>No donations yet.</p> : donations.map((log, i) => (
                                <div key={i} className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <div className="history-item-icon">💸</div>
                                    <div className="history-item-content">
                                        <p style={{ fontSize: '0.85rem' }}>
                                            <strong>{log.args.user?.slice(0,6)}...{log.args.user?.slice(-4)}</strong> donated 
                                            <strong> {formatEther(log.args.amount || 0n)} ETH</strong> to 
                                            <br/>campaign <code>{log.args.campaign?.slice(0,6)}...{log.args.campaign?.slice(-4)}</code>
                                        </p>
                                        <p className="history-item-meta">{new Date(Number(log.args.timestamp) * 1000).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>👤 Live Registrations</h3>
                        <div className="history-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {registrations.length === 0 ? <p className="text-muted" style={{textAlign: 'center', padding: '1rem'}}>No users registered yet.</p> : registrations.map((log, i) => (
                                <div key={i} className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                    <div className="history-item-icon">🙋</div>
                                    <div className="history-item-content">
                                        <p style={{ fontSize: '0.85rem' }}>
                                            User <strong>{log.args.username}</strong> joined the platform!
                                        </p>
                                        <p className="history-item-meta">{new Date(Number(log.args.timestamp) * 1000).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
