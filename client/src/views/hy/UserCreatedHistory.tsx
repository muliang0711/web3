import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

function CreatedCampaignCard({ campaign }: { campaign: { address: `0x${string}`; imageUrl?: string | null } }) {
    const { info, contributors, outstandingRefundCount, refundAll, withdrawFunds, status } = useCampaign(campaign.address);
    const navigate = useNavigate();
    const [imageFailed, setImageFailed] = useState(false);
    const [pendingRefundSuccessCount, setPendingRefundSuccessCount] = useState<string | null>(null);

    useEffect(() => {
        if (!status.isConfirmed || !status.txHash || !pendingRefundSuccessCount) {
            return;
        }

        navigate(
            `/campaigns/${campaign.address}/refund-success?count=${encodeURIComponent(pendingRefundSuccessCount)}&tx=${status.txHash}`,
            { replace: true }
        );
    }, [campaign.address, navigate, pendingRefundSuccessCount, status.isConfirmed, status.txHash]);

    if (!info) {
        return null;
    }

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();
    const canRefundAll = !info.goalReached && !info.fundsWithdrawn && outstandingRefundCount > 0n;
    const canWithdraw = isExpired && info.goalReached && !info.fundsWithdrawn;
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
                            <h3>{info.title}</h3>
                            <p>{info.description}</p>
                        </div>
                        <span className={`campaign-card-badge ${badgeClass}`}>
                            {badgeLabel}
                        </span>
                    </div>

                    <div className="created-campaign-stats">
                        <div>
                            <strong>{formatEther(info.totalFunded)} ETH</strong>
                            <small>raised</small>
                        </div>
                        <div>
                            <strong>{formatEther(info.fundingTarget)} ETH</strong>
                            <small>target</small>
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
                        <span>Deadline: {deadlineDate.toLocaleDateString()}</span>
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

                {canWithdraw && (
                    <button
                        type="button"
                        className="btn-success"
                        onClick={withdrawFunds}
                        disabled={status.isWithdrawing || status.isConfirming}
                    >
                        {status.isWithdrawing || status.isConfirming ? 'Processing...' : 'Withdraw funds'}
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
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                Back
            </button>

            <div className="profile-section-heading">
                <div>
                    <div className="auth-kicker">Owner workspace</div>
                    <h2>My created campaigns</h2>
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
