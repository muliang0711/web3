import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaign } from '../../hooks/useCampaign';
import { getCampaignImageUrl } from '../../lib/media';

function formatAmount(value: string | null) {
    const numeric = Number(value ?? 0);

    if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
    }

    return numeric.toFixed(4);
}

export function DonationSuccessView() {
    const navigate = useNavigate();
    const { address: campaignAddress } = useParams<{ address: string }>();
    const [searchParams] = useSearchParams();
    const [imageFailed, setImageFailed] = useState(false);
    const { info, contributors, status } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const donationAmount = formatAmount(searchParams.get('amount'));
    const txHash = searchParams.get('tx');
    const imageUrl = campaignAddress ? getCampaignImageUrl(campaignAddress) : null;

    const progress = useMemo(() => {
        if (!info || info.fundingTarget === 0n) {
            return 0;
        }

        return Number((info.totalFunded * 100n) / info.fundingTarget);
    }, [info]);

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Preparing confirmation...</p>
            </div>
        );
    }

    return (
        <div className="fade-in donation-success-page">
            <div className="donation-success-shell card">
                <div className="donation-success-badge">Donation confirmed</div>

                <div className="donation-success-mark" aria-hidden="true">
                    <span />
                </div>

                <div className="donation-success-copy">
                    <h1>Thank you for supporting this campaign.</h1>
                    <p>
                        Your contribution has been confirmed on-chain and recorded for rewards.
                        You can return to the campaign, review your profile activity, or continue browsing.
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
                                    <span>{info?.title?.slice(0, 1) || 'P'}</span>
                                    <small>Campaign</small>
                                </div>
                            )}
                        </div>

                        <div className="donation-success-details">
                            <div className="auth-kicker">Supported campaign</div>
                            <h2>{info?.title || 'Example Campaign for Pet Treatment'}</h2>
                            <p>{info?.description || 'Your donation was completed successfully.'}</p>
                        </div>
                    </section>

                    <section className="donation-success-stats">
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Donation amount</span>
                            <strong className="quick-stat-value">{donationAmount ?? '0.0000'} ETH</strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Points from this tx</span>
                            <strong className="quick-stat-value" style={{ color: 'var(--success)' }}>
                                +{donationAmount ?? '0.0000'} CFR
                            </strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Raised so far</span>
                            <strong className="quick-stat-value">
                                {info ? formatEther(info.totalFunded) : '0.0000'} ETH
                            </strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Backers</span>
                            <strong className="quick-stat-value">{contributors.length}</strong>
                        </div>
                    </section>
                </div>

                <div className="donation-success-progress">
                    <div className="funding-progress-header">
                        <span className="amount-raised">
                            <strong>{info ? formatEther(info.totalFunded) : '0.0000'} ETH</strong>
                        </span>
                        <span className="amount-target">
                            raised of {info ? formatEther(info.fundingTarget) : '0.0000'} ETH goal
                        </span>
                    </div>
                    <div className="progress-bar" style={{ marginTop: '0.85rem' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
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
                        onClick={() => navigate(`/campaigns/${campaignAddress}`)}
                    >
                        Return to campaign
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => navigate('/profile')}
                    >
                        View profile history
                    </button>
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => navigate('/campaigns')}
                    >
                        Browse more campaigns
                    </button>
                </div>
            </div>
        </div>
    );
}
