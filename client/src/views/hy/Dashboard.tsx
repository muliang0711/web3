import { useNavigate } from 'react-router-dom';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useState, useEffect } from 'react';
import { formatEther } from 'viem';

export function DashboardView() {
    const { user, donations } = useUserRegistry();
    const { userCampaigns } = useCampaignFactory();
    const navigate = useNavigate();

    const [totalDonated, setTotalDonated] = useState(0);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        // Calculate total donated (ETH) from real on-chain donations
        const total = donations.reduce((sum, d) => {
            if (d.amount_eth) return sum + Number(d.amount_eth);
            try {
                const amountVal = d.amount || 0n;
                return sum + Number(formatEther(amountVal));
            } catch { return sum; }
        }, 0);
        setTotalDonated(total);

        // Only show real donation activity — no fake placeholder entries
        const activity = donations.slice(0, 5).map(d => {
            let amountEth = '0';
            if (d.amount_eth) {
                amountEth = d.amount_eth;
            } else {
                try { amountEth = formatEther(d.amount || 0n); } catch { amountEth = '0'; }
            }
            return {
                id: d.id,
                name: d.campaign_name || 'Campaign Donation',
                status: 'Success',
                amount: `${amountEth} ETH`,
                date: d.created_at ? new Date(d.created_at).toLocaleDateString() : '—',
            };
        });

        setRecentActivity(activity);
    }, [donations]);

    return (
        <div className="fade-in">
            {/* Header / Welcome */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Overview</h1>
                <p>Welcome back, {user?.name || 'Explorer'}</p>
            </div>

            {/* Quick Stats Row */}
            <div className="quick-stats-row">
                <div className="quick-stat-card">
                    <span className="quick-stat-label">My Campaigns</span>
                    <span className="quick-stat-value">{userCampaigns.length}</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Donations Made</span>
                    <span className="quick-stat-value">{donations.length}</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Total Donated</span>
                    <span className="quick-stat-value" style={{ color: 'var(--success)' }}>
                        {totalDonated.toFixed(4)} ETH
                    </span>
                </div>
            </div>

            {/* Quick Actions Row */}
            <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--text)' }}>Quick Actions</h2>
            <div className="quick-actions-row">
                <button className="quick-action-btn quick-action-primary" onClick={() => navigate('/campaigns/create')}>
                    <span style={{ fontSize: '1.4rem' }}>➕</span> Create New Campaign
                </button>
                <button className="quick-action-btn quick-action-secondary" onClick={() => navigate('/campaigns')}>
                    <span style={{ fontSize: '1.4rem' }}>💰</span> Browse & Donate
                </button>
            </div>

            {/* Recent Activity Table */}
            <div className="recent-activity-section">
                <h2 className="recent-activity-header">Recent Activity / Logs</h2>
                {recentActivity.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                        No donation activity yet. <button className="btn-link" onClick={() => navigate('/campaigns')}>Browse campaigns →</button>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Campaign Name</th>
                                    <th>Status</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.map((item, i) => (
                                    <tr key={item.id || i}>
                                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                                        <td>
                                            <span className={`status-badge ${item.status.toLowerCase()}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{item.amount}</td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{item.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
