import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaign } from '../../hooks/useCampaign';
import { getCampaignImageUrl } from '../../lib/media';

export function WithdrawSuccessView() {
    const navigate = useNavigate();
    const { address: campaignAddress } = useParams<{ address: string }>();
    const [searchParams] = useSearchParams();
    const [imageFailed, setImageFailed] = useState(false);
    const { info, status } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const txHash = searchParams.get('tx');
    const imageUrl = campaignAddress ? getCampaignImageUrl(campaignAddress) : null;

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Preparing withdrawal confirmation...</p>
            </div>
        );
    }

    return (
        <div className="fade-in donation-success-page">
            <div className="donation-success-shell card">
                <div className="donation-success-badge">Withdrawal confirmed</div>

                <div className="donation-success-copy">
                    <h1>Campaign funds were released to the owner wallet.</h1>
                    <p>
                        The withdrawal transaction is confirmed on-chain. This campaign is now marked as settled,
                        and supporters can still review the public campaign page and owner report.
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
                                    <span>{info?.title?.slice(0, 1) || 'W'}</span>
                                    <small>Campaign</small>
                                </div>
                            )}
                        </div>

                        <div className="donation-success-details">
                            <div className="auth-kicker">Settled campaign</div>
                            <h2>{info?.title || 'Campaign'}</h2>
                            <p>{info?.description || 'The owner withdrawal completed successfully.'}</p>
                        </div>
                    </section>

                    <section className="donation-success-stats">
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Withdrawn amount</span>
                            <strong className="quick-stat-value">
                                {info ? formatEther(info.totalFunded) : '0.0000'} ETH
                            </strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Campaign state</span>
                            <strong className="quick-stat-value" style={{ color: 'var(--success)' }}>
                                Settled
                            </strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Funds withdrawn</span>
                            <strong className="quick-stat-value">{info?.fundsWithdrawn ? 'Yes' : 'Pending sync'}</strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Goal reached</span>
                            <strong className="quick-stat-value">{info?.goalReached ? 'Yes' : 'Unknown'}</strong>
                        </div>
                    </section>
                </div>

                {txHash && (
                    <div className="donation-success-tx">
                        <span>Transaction hash</span>
                        <strong>{txHash}</strong>
                    </div>
                )}

                <div className="donation-success-actions">
                    <button
                        type="button"
                        className="btn-success"
                        onClick={() => navigate(`/campaigns/${campaignAddress}/report`)}
                    >
                        Confirm and open owner report
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => navigate('/user/created-history')}
                    >
                        Back to my campaign
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
