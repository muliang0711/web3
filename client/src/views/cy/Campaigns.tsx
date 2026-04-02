import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

// Sub-component: renders one campaign card
function CampaignCard({ campaignAddress }: { campaignAddress: `0x${string}` }) {
    const { info, status } = useCampaign(campaignAddress);
    const navigate = useNavigate();

    if (!info) {
        if (status.isLoadingInfo) {
            return (
                <div className="campaign-card skeleton-card">
                    <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
            );
        }
        // If not loading but still no info — the address is stale/invalid, hide it
        return null;
    }

    const progress = info.fundingTarget > 0n
        ? Number((info.totalFunded * 100n) / info.fundingTarget)
        : 0;

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();

    // Dynamic gradient thumbnail from address
    const hue1 = parseInt(campaignAddress.slice(2, 4), 16) || 60;
    const hue2 = parseInt(campaignAddress.slice(4, 6), 16) || 180;
    const gradient = `linear-gradient(135deg, hsl(${hue1}, 70%, 45%), hsl(${hue2}, 80%, 30%))`;

    return (
        <button
            className="campaign-card"
            onClick={() => navigate(`/campaigns/${campaignAddress}`)}
        >
                <div className="campaign-card-thumb" style={{ background: gradient }}>
                    <span className={`campaign-card-badge ${info.goalReached ? 'badge-success' : isExpired ? 'badge-danger' : 'badge-active'}`}>
                        {info.goalReached ? 'Funded' : isExpired ? 'Ended' : 'Active'}
                    </span>
                </div>
            <div className="campaign-card-content">
                <h4 className="campaign-card-title">{info.title}</h4>
                <p className="campaign-card-desc">{info.description}</p>
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ height: '8px' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                    <div className="campaign-card-stats" style={{ marginTop: '0.5rem' }}>
                        <span><strong>{formatEther(info.totalFunded)}</strong> / {formatEther(info.fundingTarget)} ETH</span>
                        <span style={{ color: progress >= 100 ? 'var(--success)' : 'var(--text-secondary)' }}>{progress}%</span>
                    </div>
                </div>
            </div>
        </button>
    );
}

export function CampaignsView() {
    const { campaigns, status } = useCampaignFactory();
    const navigate = useNavigate();

    return (
        <div className="fade-in">
            {/* Back button */}
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                Back
            </button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <h2>Campaigns</h2>
                <p style={{ marginTop: '0.25rem' }}>Browse or create fundraising campaigns for the survey ecosystem</p>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/campaigns/create')}
                >
                    Create a new campaign
                </button>
            </div>

            {status.isLoadingCampaigns ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading campaigns...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    No campaigns yet. Create the first one.
                </div>
            ) : (
                <div className="campaign-list">
                    {[...campaigns].reverse().map((camp) => (
                        <CampaignCard key={camp.address || camp} campaignAddress={camp.address || camp} />
                    ))}
                </div>
            )}
        </div>
    );
}
