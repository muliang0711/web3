import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

function CampaignCard({ campaign }: { campaign: { address: `0x${string}`; imageUrl?: string | null } }) {
    const { info, status } = useCampaign(campaign.address);
    const navigate = useNavigate();
    const [imageFailed, setImageFailed] = useState(false);

    if (!info) {
        if (status.isLoadingInfo) {
            return (
                <div className="campaign-showcase-card skeleton-card">
                    <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
            );
        }
        return null;
    }

    const progress = info.fundingTarget > 0n
        ? Number((info.totalFunded * 100n) / info.fundingTarget)
        : 0;

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();
    const imageUrl = campaign.imageUrl || null;
    const badgeClass = info.isCancelled
        ? 'badge-cancelled'
        : info.goalReached
            ? 'badge-success'
            : isExpired
                ? 'badge-danger'
                : 'badge-active';
    const badgeLabel = info.isCancelled
        ? 'Cancelled'
        : info.goalReached
            ? 'Funded'
            : isExpired
                ? 'Ended'
                : 'Active';

    return (
        <button
            className={`campaign-showcase-card ${info.isCancelled ? 'campaign-showcase-card-cancelled' : ''}`}
            onClick={() => navigate(`/campaigns/${campaign.address}`)}
        >
            <div className="campaign-showcase-media">
                {imageUrl && !imageFailed ? (
                    <img
                        src={imageUrl}
                        alt={info.title}
                        className="media-cover-image"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="media-cover-placeholder">
                        <span>{info.title.slice(0, 1)}</span>
                        <small>Campaign visual</small>
                    </div>
                )}

                <span className={`campaign-card-badge ${badgeClass}`}>
                    {badgeLabel}
                </span>
            </div>

            <div className="campaign-showcase-content">
                <div className="campaign-showcase-header">
                    <h3 className="campaign-card-title">{info.title}</h3>
                    <span className="campaign-showcase-progress">{progress}%</span>
                </div>

                <p className="campaign-card-desc">{info.description}</p>

                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>

                <div className="campaign-card-stats">
                    <span><strong>{formatEther(info.totalFunded)}</strong> ETH raised</span>
                    <span>{contributorsLabel(info.title, deadlineDate)}</span>
                </div>

                <div className="campaign-showcase-footer">
                    <span>Goal: {formatEther(info.fundingTarget)} ETH</span>
                    <span>{deadlineDate.toLocaleDateString()}</span>
                </div>
            </div>
        </button>
    );
}

function contributorsLabel(_title: string, deadlineDate: Date) {
    const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) {
        return 'Closed';
    }
    return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
}

export function CampaignsView() {
    const { campaigns, status } = useCampaignFactory();
    const navigate = useNavigate();

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/profile')}>
                Back to profile
            </button>

            <div className="campaigns-header">
                <div>
                    <div className="auth-kicker">Campaign board</div>
                    <h2>Browse campaign cards</h2>
                    <p>Each campaign is presented as a cleaner visual card with room for imagery, progress, and quick scanning.</p>
                </div>

                <button className="btn-primary campaigns-header-cta" onClick={() => navigate('/campaigns/create')}>
                    Create a new campaign
                </button>
            </div>

            {status.isLoadingCampaigns ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading campaigns...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="empty-state-card">
                    No campaigns yet. Create the first one.
                </div>
            ) : (
                <div className="campaigns-grid">
                    {[...campaigns].reverse().map((campaign) => (
                        <CampaignCard key={campaign.address} campaign={campaign} />
                    ))}
                </div>
            )}
        </div>
    );
}
