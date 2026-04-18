import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

function CreatedCampaignCard({ campaign }: { campaign: { address: `0x${string}`; imageUrl?: string | null; title?: string | null; description?: string | null; target_eth?: string | number | null; duration_days?: number | null; created_at?: string | null; isLive?: boolean } }) {
    const { info, contributors, outstandingRefundCount, refundAll, withdrawFunds, status } = useCampaign(campaign.address);
    const navigate = useNavigate();
    const [imageFailed, setImageFailed] = useState(false);
    const [pendingRefundSuccessCount, setPendingRefundSuccessCount] = useState<string | null>(null);
    const [pendingWithdrawNavigation, setPendingWithdrawNavigation] = useState(false);

    useEffect(() => {
        if (!status.isConfirmed || !status.txHash || !pendingRefundSuccessCount) {
            return;
        }

        navigate(
            `/campaigns/${campaign.address}/refund-success?count=${encodeURIComponent(pendingRefundSuccessCount)}&tx=${status.txHash}`,
            { replace: true }
        );
    }, [campaign.address, navigate, pendingRefundSuccessCount, status.isConfirmed, status.txHash]);

    useEffect(() => {
        if (!status.isConfirmed || !status.txHash || !pendingWithdrawNavigation) {
            return;
        }

        navigate(
            `/campaigns/${campaign.address}/withdraw-success?tx=${status.txHash}`,
            { replace: true }
        );
    }, [campaign.address, navigate, pendingWithdrawNavigation, status.isConfirmed, status.txHash]);

    if (!info) {
        if (campaign.title) {
            return (
                <article className="created-campaign-card created-campaign-card-archived">
                    <div className="created-campaign-card-body">
                        <div className="created-campaign-media">
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
                                    <small>Archived owner card</small>
                                </div>
                            )}
                        </div>

                        <div className="created-campaign-content">
                            <div className="created-campaign-header">
                                <div>
                                    <h3>{campaign.title}</h3>
                                    <p>{campaign.description || 'This campaign record is preserved in Supabase, but it is not deployed on the current chain session.'}</p>
                                </div>
                                <span className="campaign-card-badge badge-danger">
                                    Archived
                                </span>
                            </div>

                            <div className="created-campaign-stats">
                                <div>
                                    <strong>{Number(campaign.target_eth || 0).toFixed(4)} ETH</strong>
                                    <small>target</small>
                                </div>
                                <div>
                                    <strong>{campaign.duration_days ?? '—'}</strong>
                                    <small>days</small>
                                </div>
                                <div>
                                    <strong>{campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'Stored'}</strong>
                                    <small>recorded</small>
                                </div>
                                <div>
                                    <strong>Offline</strong>
                                    <small>current chain state</small>
                                </div>
                            </div>

                            <div className="created-campaign-meta">
                                <span>This campaign is loaded from Supabase. Chain-only actions will work again after redeploying the contracts.</span>
                                <span>{campaign.address.slice(0, 6)}...{campaign.address.slice(-4)}</span>
                            </div>
                        </div>
                    </div>
                </article>
            );
        }

        return null;
    }

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();
    const canRefundAll = !info.goalReached && !info.fundsWithdrawn && outstandingRefundCount > 0n;
    const canWithdraw = info.goalReached && !info.fundsWithdrawn;
    const showWithdrawAction = info.goalReached || info.fundsWithdrawn;
    const isWithdrawDisabled = status.isWithdrawing || status.isConfirming || !canWithdraw;
    const withdrawButtonLabel = status.isWithdrawing || status.isConfirming
        ? 'Processing...'
        : info.fundsWithdrawn
            ? 'Funds withdrawn'
            : canWithdraw
                ? 'Withdraw funds'
                : 'Withdraw unavailable';
    const withdrawButtonTitle = info.fundsWithdrawn
        ? 'This campaign has already been withdrawn.'
        : canWithdraw
            ? 'Withdraw the raised ETH to the creator wallet.'
            : 'Withdrawal is not available for this campaign yet.';
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
            ? 'Goal reached'
            : isExpired
                ? 'Refund window'
                : 'In progress';

    const handleRefundAll = () => {
        setPendingRefundSuccessCount(outstandingRefundCount.toString());
        refundAll();
    };

    const handleWithdrawFunds = async () => {
        setPendingWithdrawNavigation(true);

        try {
            await withdrawFunds();
        } catch (error: any) {
            setPendingWithdrawNavigation(false);
            const reason = error?.message || 'Withdrawal failed.';
            navigate(
                `/campaigns/${campaign.address}/withdraw-failed?reason=${encodeURIComponent(reason)}`,
                { replace: true }
            );
        }
    };

    return (
        <article className={`created-campaign-card ${info.isCancelled ? 'created-campaign-card-cancelled' : ''}`}>
            <button type="button" className="created-campaign-card-body" onClick={() => navigate(`/campaigns/${campaign.address}/report`)}>
                <div className="created-campaign-media">
                    {campaign.imageUrl && !imageFailed ? (
                        <img
                            src={campaign.imageUrl}
                            alt={info.title}
                            className="media-cover-image"
                            onError={() => setImageFailed(true)}
                        />
                    ) : (
                        <div className="media-cover-placeholder">
                            <span>{info.title.slice(0, 1)}</span>
                            <small>Owner card</small>
                        </div>
                    )}
                </div>

                <div className="created-campaign-content">
                    <div className="created-campaign-header">
                        <div>
                            <h3>{campaign.title || info.title}</h3>
                            <p>{campaign.description || info.description}</p>
                        </div>
                        <span className={`campaign-card-badge ${badgeClass}`}>
                            {badgeLabel}
                        </span>
                    </div>

                    <div className="created-campaign-stats">
                        <div>
                            <strong>{Number(campaign.target_eth || 0).toFixed(4)} ETH</strong>
                            <small>target</small>
                        </div>
                        <div>
                            <strong>{campaign.duration_days ?? '—'}</strong>
                            <small>days</small>
                        </div>
                        <div>
                            <strong>{contributors.length}</strong>
                            <small>contributors</small>
                        </div>
                        <div>
                            <strong>{outstandingRefundCount.toString()}</strong>
                            <small>refunds pending</small>
                        </div>
                    </div>

                    <div className="created-campaign-meta">
                        <span>Created: {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'Stored record'}</span>
                        <span>{campaign.address.slice(0, 6)}...{campaign.address.slice(-4)}</span>
                    </div>
                </div>
            </button>

            <div className="created-campaign-actions">
                <button type="button" className="btn-ghost" onClick={() => navigate(`/campaigns/${campaign.address}/report`)}>
                    Open report
                </button>

                <button type="button" className="btn-ghost" onClick={() => navigate(`/campaigns/${campaign.address}`)}>
                    Public page
                </button>

                {showWithdrawAction && (
                    <button
                        type="button"
                        className="btn-success"
                        onClick={() => { void handleWithdrawFunds(); }}
                        disabled={isWithdrawDisabled}
                        title={withdrawButtonTitle}
                    >
                        {withdrawButtonLabel}
                    </button>
                )}

                {canRefundAll && (
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={handleRefundAll}
                        disabled={status.isRefunding || status.isConfirming}
                    >
                        {status.isRefunding || status.isConfirming ? 'Refunding...' : isExpired ? 'Refund all contributors' : 'Refund all now'}
                    </button>
                )}
            </div>

            {status.error && (
                <p className="text-danger">{status.error.message}</p>
            )}
        </article>
    );
}

export function UserCreatedHistoryView() {
    const navigate = useNavigate();
    const { userCampaigns, status } = useCampaignFactory();

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/profile')}>
                Back to profile
            </button>

            <div className="profile-section-heading">
                <div>
                    <div className="auth-kicker">Owner workspace</div>
                    <h2>My campaign</h2>
                    <p>Review performance, withdraw funded campaigns, or process contributor refunds once a campaign ends unsuccessfully.</p>
                </div>
            </div>

            {status.isLoadingCampaigns ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                </div>
            ) : userCampaigns.length === 0 ? (
                <div className="empty-state-card">
                    You haven't created any campaigns yet.
                </div>
            ) : (
                <div className="created-campaign-list">
                    {userCampaigns.map((campaign) => (
                        <CreatedCampaignCard key={campaign.address} campaign={campaign} />
                    ))}
                </div>
            )}
        </div>
    );
}
