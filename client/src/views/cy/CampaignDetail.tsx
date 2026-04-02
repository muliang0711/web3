import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useCampaign } from '../../hooks/useCampaign';
import { getCampaignImageUrl } from '../../lib/media';

export function CampaignDetailView() {
    const { address: campaignAddress } = useParams<{ address: string }>();
    const { address: userAddress } = useAccount();
    const navigate = useNavigate();
    const [donateAmount, setDonateAmount] = useState('');
    const [imageFailed, setImageFailed] = useState(false);
    const [pendingSuccessAmount, setPendingSuccessAmount] = useState<string | null>(null);

    const {
        info,
        contribution,
        contributors,
        contribute,
        withdrawFunds,
        status,
    } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const handleDonate = (e: React.FormEvent) => {
        e.preventDefault();
        if (donateAmount && Number(donateAmount) > 0) {
            setPendingSuccessAmount(donateAmount);
            contribute(donateAmount);
            setDonateAmount('');
        }
    };

    useEffect(() => {
        if (!campaignAddress || !pendingSuccessAmount || !status.isConfirmed || !status.txHash) {
            return;
        }

        navigate(
            `/campaigns/${campaignAddress}/success?amount=${encodeURIComponent(pendingSuccessAmount)}&tx=${status.txHash}`,
            { replace: true }
        );
    }, [campaignAddress, navigate, pendingSuccessAmount, status.isConfirmed, status.txHash]);

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Loading campaign...</p>
            </div>
        );
    }

    if (!info || !campaignAddress) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <p>Campaign not found.</p>
                <button className="btn-ghost" onClick={() => navigate('/campaigns')} style={{ marginTop: '1rem' }}>
                    Back to campaigns
                </button>
            </div>
        );
    }

    const progress = info.fundingTarget > 0n
        ? Number((info.totalFunded * 100n) / info.fundingTarget)
        : 0;

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();
    const canDonate = !isExpired && !info.goalReached && !info.isCancelled;
    const isCreator = userAddress?.toLowerCase() === info.creator.toLowerCase();
    const canWithdraw = isExpired && info.goalReached && isCreator && !info.fundsWithdrawn;
    const imageUrl = getCampaignImageUrl(campaignAddress);
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
        <div className="fade-in campaign-detail-wrapper">
            <button className="btn-back" onClick={() => navigate('/campaigns')}>
                Back to campaigns
            </button>

            <div className="campaign-detail-grid">
                <div className="campaign-info-section">
                    <div className="campaign-detail-hero-card">
                        <div className="campaign-detail-media">
                            {!imageFailed ? (
                                <img
                                    src={imageUrl}
                                    alt={info.title}
                                    className="media-cover-image"
                                    onError={() => setImageFailed(true)}
                                />
                            ) : (
                                <div className="media-cover-placeholder">
                                    <span>{info.title.slice(0, 1)}</span>
                                    <small>Campaign picture</small>
                                </div>
                            )}
                        </div>

                        <div className="campaign-detail-header">
                            <div className="campaign-detail-title-row">
                                <h2 style={{ fontSize: '2rem', lineHeight: 1.2 }}>{info.title}</h2>
                                <span className={`campaign-card-badge ${badgeClass}`}>
                                    {badgeLabel}
                                </span>
                            </div>

                            <p className="campaign-detail-desc">{info.description}</p>

                            <div className="campaign-detail-meta-grid">
                                <div className="campaign-meta-pill">
                                    <span>Creator</span>
                                    <strong>{info.creator.slice(0, 6)}...{info.creator.slice(-4)} {isCreator ? '(You)' : ''}</strong>
                                </div>
                                <div className="campaign-meta-pill">
                                    <span>Deadline</span>
                                    <strong>{deadlineDate.toLocaleDateString()}</strong>
                                </div>
                                <div className="campaign-meta-pill">
                                    <span>Backers</span>
                                    <strong>{contributors.length}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {contribution > 0n && (
                        <div className="contribution-banner">
                            You contributed <strong>{formatEther(contribution)} ETH</strong>. Points earned from this transaction: <strong>{formatEther(contribution)} CFR</strong>.
                        </div>
                    )}
                </div>

                <div className="campaign-donate-card">
                    <div className="funding-progress-header">
                        <span className="amount-raised"><strong>{formatEther(info.totalFunded)} ETH</strong></span>
                        <span className="amount-target">raised of {formatEther(info.fundingTarget)} ETH goal</span>
                    </div>

                    <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>

                    <div className="campaign-card-stats" style={{ marginBottom: '1.5rem' }}>
                        <span>{contributors.length} contributors</span>
                        <span>{progress}% funded</span>
                    </div>

                    {canDonate && (
                        <form onSubmit={handleDonate} className="donate-form-integrated">
                            <div className="input-with-symbol">
                                <span className="currency-symbol">ETH</span>
                                <input
                                    className="input large-input"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    value={donateAmount}
                                    onChange={(e) => setDonateAmount(e.target.value)}
                                    required
                                    disabled={status.isContributing || status.isConfirming}
                                />
                            </div>

                            <button className="btn-success large-btn" type="submit" disabled={status.isContributing || status.isConfirming}>
                                {status.isContributing || status.isConfirming ? 'Processing...' : 'Donate to this campaign'}
                            </button>
                        </form>
                    )}

                    {canWithdraw && (
                        <button className="btn-success large-btn" type="button" onClick={withdrawFunds} disabled={status.isWithdrawing || status.isConfirming}>
                            {status.isWithdrawing || status.isConfirming ? 'Processing...' : 'Withdraw funds'}
                        </button>
                    )}

                    {!canDonate && !canWithdraw && (
                        <div className="campaign-closed-message">
                            {info.goalReached
                                ? 'This campaign has reached its goal. Waiting for the creator to withdraw.'
                                : info.isCancelled
                                    ? 'This campaign was cancelled by the owner.'
                                    : 'This campaign is closed and not accepting new donations.'}
                        </div>
                    )}

                    {status.error && (
                        <p className="text-danger" style={{ marginTop: '1rem', textAlign: 'center' }}>{status.error.message}</p>
                    )}

                    {status.isConfirmed && (
                        <p style={{ color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem', fontWeight: 700 }}>
                            Transaction confirmed successfully.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
