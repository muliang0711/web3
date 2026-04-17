import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaign } from '../../hooks/useCampaign';
import { getCampaignImageUrl } from '../../lib/media';

function formatRefundCount(value: string | null) {
    const numeric = Number(value ?? 0);

    if (!Number.isFinite(numeric) || numeric <= 0) {
        return '0';
    }

    return String(numeric);
}

export function RefundSuccessView() {
    const navigate = useNavigate();
    const { address: campaignAddress } = useParams<{ address: string }>();
    const [searchParams] = useSearchParams();
    const [imageFailed, setImageFailed] = useState(false);
    const { info, status } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const refundedCount = formatRefundCount(searchParams.get('count'));
    const txHash = searchParams.get('tx');
    const imageUrl = campaignAddress ? getCampaignImageUrl(campaignAddress) : null;

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Preparing refund confirmation...</p>
            </div>
        );
    }

    return (
        <div className="fade-in donation-success-page">
            <div className="donation-success-shell card">
                <div className="donation-success-badge">Refund action confirmed</div>

                <div className="donation-success-copy">
                    <h1>Refund completed</h1>
                    <p>
                        The owner refund transaction is confirmed on-chain. Contributors can now verify the returned funds in their wallet and refund history.
                    </p>
                </div>

                <div className="donation-success-grid">
                    <section className="donation-success-summary">
                        <div className="donation-success-media">
                            {imageUrl && !imageFailed ? (
                                <img
                                    src={imageUrl}
                                    alt={info?.title || 'Campaign'}
                                    className="media-cover-image"
                                    onError={() => setImageFailed(true)}
                                />
                            ) : (
                                <div className="media-cover-placeholder">
                                    <span>{info?.title?.slice(0, 1) || 'R'}</span>
                                    <small>Campaign</small>
                                </div>
                            )}
                        </div>

                        <div className="donation-success-details">
                            <div className="auth-kicker">Refunded campaign</div>
                            <h2>{info?.title || 'Pet Treatment Campaign'}</h2>
                            <p>{info?.description || 'This campaign has completed the refund flow for the affected contributors.'}</p>
                        </div>
                    </section>

                    <section className="donation-success-stats">
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Refunded contributors</span>
                            <strong className="quick-stat-value">{refundedCount}</strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Campaign status</span>
                            <strong className="quick-stat-value" style={{ color: 'var(--danger)' }}>
                                Refund complete
                            </strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Remaining raised</span>
                            <strong className="quick-stat-value">
                                {info ? formatEther(info.totalFunded) : '0.0000'} ETH
                            </strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">On-chain tx</span>
                            <strong className="quick-stat-value">{txHash ? 'Recorded' : 'Unavailable'}</strong>
                        </div>
                    </section>
                </div>

                <div className="donation-success-actions">
                    <button
                        type="button"
                        className="btn-success"
                        onClick={() => navigate(`/campaigns/${campaignAddress}/report`)}
                    >
                        Back to owner report
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => navigate('/user/created-history')}
                    >
                        View my campaign
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => navigate(`/campaigns/${campaignAddress}`)}
                    >
                        Open public campaign
                    </button>
                </div>
            </div>
        </div>
    );
}
