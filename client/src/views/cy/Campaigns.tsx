import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';

function CampaignCard({ campaign }: { campaign: { address: `0x${string}`; imageUrl?: string | null; title?: string | null; description?: string | null; target_eth?: string | number | null; duration_days?: number | null; created_at?: string | null } }) {
    const navigate = useNavigate();
    const [imageFailed, setImageFailed] = useState(false);
    if (!campaign.title) return null;
    const createdAtLabel = campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'Stored record';
    const durationLabel = campaign.duration_days ? `${campaign.duration_days} day${campaign.duration_days === 1 ? '' : 's'}` : 'No duration';

    return (
        <button
            className="campaign-showcase-card"
            onClick={() => navigate(`/campaigns/${campaign.address}`)}
        >
            <div className="campaign-showcase-media">
                {campaign.imageUrl && !imageFailed ? (
                    <img
                        src={campaign.imageUrl}
                        alt={campaign.title}
                        className="media-cover-image"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="media-cover-placeholder">
                        <span>{campaign.title.slice(0, 1)}</span>
                        <small>Campaign visual</small>
                    </div>
                )}

                <span className="campaign-card-badge badge-active">
                    Stored
                </span>
            </div>

            <div className="campaign-showcase-content">
                <div className="campaign-showcase-header">
                    <h3 className="campaign-card-title">{campaign.title}</h3>
                    <span className="campaign-showcase-progress">{Number(campaign.target_eth || 0).toFixed(2)} ETH</span>
                </div>

                <p className="campaign-card-desc">
                    {campaign.description || 'Campaign details were saved successfully and are loaded from Supabase.'}
                </p>

                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '100%' }} />
                </div>

                <div className="campaign-card-stats">
                    <span><strong>{Number(campaign.target_eth || 0).toFixed(4)}</strong> ETH target</span>
                    <span>{durationLabel}</span>
                </div>

                <div className="campaign-showcase-footer">
                    <span>{createdAtLabel}</span>
                    <span>{campaign.address.slice(0, 6)}...{campaign.address.slice(-4)}</span>
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
                    {campaigns.map((campaign) => (
                        <CampaignCard key={campaign.address} campaign={campaign} />
                    ))}
                </div>
            )}
        </div>
    );
}
