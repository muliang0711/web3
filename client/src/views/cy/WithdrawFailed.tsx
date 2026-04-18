import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCampaign } from '../../hooks/useCampaign';
import { getCampaignImageUrl } from '../../lib/media';

function getFriendlyFailureMessage(reason: string | null) {
    if (!reason) {
        return 'The withdrawal transaction did not complete.';
    }

    const lower = reason.toLowerCase();

    if (lower.includes('user rejected') || lower.includes('rejected the request')) {
        return 'The wallet request was cancelled before the withdrawal could be submitted.';
    }

    if (lower.includes('exceeds transaction gas cap') || lower.includes('gas cap')) {
        return 'The network rejected the transaction because the requested gas limit was above the current gas cap.';
    }

    if (lower.includes('funding target was not reached')) {
        return 'This campaign has not reached its funding target yet, so withdrawal is not allowed.';
    }

    if (lower.includes('funds already withdrawn')) {
        return 'This campaign was already withdrawn earlier.';
    }

    if (lower.includes('only the campaign creator')) {
        return 'Only the campaign creator can withdraw the funds.';
    }

    return 'The withdrawal transaction failed before it could be confirmed.';
}

export function WithdrawFailedView() {
    const navigate = useNavigate();
    const { address: campaignAddress } = useParams<{ address: string }>();
    const [searchParams] = useSearchParams();
    const [imageFailed, setImageFailed] = useState(false);
    const { info, status } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const reason = searchParams.get('reason');
    const txHash = searchParams.get('tx');
    const imageUrl = campaignAddress ? getCampaignImageUrl(campaignAddress) : null;
    const friendlyMessage = getFriendlyFailureMessage(reason);

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Preparing withdrawal result...</p>
            </div>
        );
    }

    return (
        <div className="fade-in donation-success-page">
            <div className="donation-success-shell donation-success-shell-danger card">
                <div className="donation-success-badge donation-success-badge-danger">Withdrawal failed</div>

                <div className="donation-success-copy">
                    <h1>The withdrawal was not completed.</h1>
                    <p>{friendlyMessage}</p>
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
                                    <span>{info?.title?.slice(0, 1) || 'F'}</span>
                                    <small>Campaign</small>
                                </div>
                            )}
                        </div>

                        <div className="donation-success-details">
                            <div className="auth-kicker">Affected campaign</div>
                            <h2>{info?.title || 'Campaign'}</h2>
                            <p>{info?.description || 'Review the campaign state and try the withdrawal again after confirming the requirements.'}</p>
                        </div>
                    </section>

                    <section className="donation-success-stats">
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Funding goal reached</span>
                            <strong className="quick-stat-value">{info?.goalReached ? 'Yes' : 'No'}</strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Funds withdrawn</span>
                            <strong className="quick-stat-value">{info?.fundsWithdrawn ? 'Yes' : 'No'}</strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">Raw result</span>
                            <strong className="quick-stat-value withdraw-failure-state">Needs review</strong>
                        </div>
                        <div className="success-stat-card">
                            <span className="quick-stat-label">On-chain tx</span>
                            <strong className="quick-stat-value">{txHash ? 'Submitted' : 'Not submitted'}</strong>
                        </div>
                    </section>
                </div>

                {reason && (
                    <div className="donation-success-tx withdraw-failure-reason">
                        <span>Failure details</span>
                        <strong>{reason}</strong>
                    </div>
                )}

                <div className="donation-success-actions">
                    <button
                        type="button"
                        className="btn-success"
                        onClick={() => navigate(`/campaigns/${campaignAddress}/report`)}
                    >
                        Confirm and review owner report
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
