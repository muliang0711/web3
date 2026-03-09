import { useAccount } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

// Sub-component: renders one donation history row
function DonationRow({ campaignAddress }: { campaignAddress: `0x${string}` }) {
    const { info, contribution } = useCampaign(campaignAddress);

    if (!info || contribution === 0n) return null;

    return (
        <div className="history-item">
            <div className="history-item-icon">💰</div>
            <div className="history-item-content">
                <p className="history-item-text">
                    You donated <strong>{formatEther(contribution)} ETH</strong> to campaign <strong>"{info.title}"</strong>
                </p>
                <p className="history-item-meta">
                    Campaign {info.goalReached ? '✅ Goal reached' : '⏳ In progress'} · Target: {formatEther(info.fundingTarget)} ETH
                </p>
            </div>
        </div>
    );
}

export function ProfileView() {
    const { address } = useAccount();
    const { user } = useUserRegistry();
    const { campaigns, status } = useCampaignFactory();
    const navigate = useNavigate();

    // Calculate total donated across all campaigns
    // We'll display this in the stat cards; actual sum is computed from DonationRows
    // For simplicity, we show the campaign count and let rows handle amounts

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
                    <span className="stat-value accent">🏅</span>
                    <span className="stat-label">Donor Badge</span>
                </div>
            </div>

            {/* Donation History */}
            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text)' }}>
                    📜 Donation History
                </h3>

                {status.isLoadingCampaigns ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}>
                        <div className="spinner" />
                        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading campaigns...</p>
                    </div>
                ) : campaigns.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No campaigns found yet.
                    </div>
                ) : (
                    <div className="history-list">
                        {campaigns.map((addr) => (
                            <DonationRow key={addr} campaignAddress={addr} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
