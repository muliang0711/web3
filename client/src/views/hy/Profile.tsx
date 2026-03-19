import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

// Sub-component: renders one donation record from history
function DonationRecordRow({ record }: { record: { campaign: string, amount: bigint, timestamp: bigint } }) {
    const { info } = useCampaign(record.campaign as `0x${string}`);
    const date = new Date(Number(record.timestamp) * 1000).toLocaleString();
    const points = Number(formatEther(record.amount)) * 100; // Example: 100 points per ETH

    return (
        <div className="history-item">
            <div className="history-item-icon">⭐</div>
            <div className="history-item-content">
                <p className="history-item-text" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    On <strong>{date}</strong>, you donated <strong>{formatEther(record.amount)} ETH</strong> to <strong>{info ? info.title : (record.campaign.slice(0, 6) + '...')}</strong>
                </p>
                <p className="history-item-meta" style={{ marginTop: '0.25rem', color: '#ffc107', fontWeight: 'bold' }}>
                    🏆 Earned {points.toFixed(0)} Points
                </p>
            </div>
        </div>
    );
}

export function ProfileView() {
    const { address } = useAccount();
    const { user, donations, status: userStatus } = useUserRegistry();
    const { campaigns } = useCampaignFactory();
    const navigate = useNavigate();

    // Calculate total points
    const totalPoints = donations.reduce((acc, current) => acc + (Number(formatEther(current.amount)) * 100), 0);

    return (
        <div className="fade-in">
            {/* Back button */}
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            {/* Profile header */}
            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👤</div>
                <h2>{user?.name}</h2>
                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {address}
                </p>
            </div>

            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <span className="stat-value">{campaigns.length}</span>
                    <span className="stat-label">Campaigns Available</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value accent">🏆 {totalPoints.toFixed(0)}</span>
                    <span className="stat-label">Total Points</span>
                </div>
            </div>

            {/* Donation History */}
            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)' }}>
                    📜 Transaction History
                </h3>

                {userStatus.isReadingDonations ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}>
                        <div className="spinner" />
                        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading history...</p>
                    </div>
                ) : donations.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No transactions found yet.
                    </div>
                ) : (
                    <div className="history-list">
                        {[...donations].reverse().map((record, idx) => (
                            <DonationRecordRow key={idx} record={record} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
