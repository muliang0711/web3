import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useCampaign } from '../../hooks/useCampaign';

export function CampaignDetailView() {
    const { address: campaignAddress } = useParams<{ address: string }>();
    const { address: userAddress } = useAccount();
    const navigate = useNavigate();
    const [donateAmount, setDonateAmount] = useState('');

    const {
        info,
        contribution,
        contributors,
        contribute,
        status,
    } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const handleDonate = (e: React.FormEvent) => {
        e.preventDefault();
        if (donateAmount && Number(donateAmount) > 0) {
            contribute(donateAmount);
            setDonateAmount('');
        }
    };

    const isProcessing = status.isContributing || status.isConfirming;

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Loading campaign...</p>
            </div>
        );
    }

    if (!info) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <p>Campaign not found.</p>
                <button className="btn-ghost" onClick={() => navigate('/campaigns')} style={{ marginTop: '1rem' }}>
                    ← Back to Campaigns
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

    return (
        <div className="fade-in campaign-detail-wrapper">
            {/* Back button */}
            <button className="btn-back" onClick={() => navigate('/campaigns')}>
                ← Back to Campaigns
            </button>

            <div className="campaign-detail-grid">
                {/* Left Column: Campaign Info */}
                <div className="campaign-info-section">
                    <div className="campaign-detail-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '2rem', margin: 0, lineHeight: 1.2 }}>{info.title}</h2>
                            <span className={`campaign-card-badge ${info.goalReached ? 'badge-success' : isExpired ? 'badge-danger' : 'badge-active'}`} style={{ position: 'static' }}>
                                {info.goalReached ? '✅ Funded' : isExpired ? '❌ Ended' : '🟢 Active'}
                            </span>
                        </div>
                        <p className="campaign-detail-desc">
                            {info.description}
                        </p>
                        <p className="campaign-creator">
                            <span style={{ color: 'var(--text-muted)' }}>Created by:</span>{' '}
                            <span style={{ fontFamily: 'monospace', color: 'var(--primary-light)' }}>
                                {info.creator.slice(0, 6)}...{info.creator.slice(-4)}
                            </span>
                            {isCreator && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>(You)</span>}
                        </p>
                    </div>

                    <div className="campaign-stats-row border-top" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', display: 'flex', gap: '2rem' }}>
                        <div className="stat-card transparent">
                            <span className="stat-value">{contributors.length}</span>
                            <span className="stat-label">Backers</span>
                        </div>
                        <div className="stat-card transparent">
                            <span className="stat-value">{deadlineDate.toLocaleDateString()}</span>
                            <span className="stat-label">Deadline</span>
                        </div>
                    </div>

                    {/* Your Contribution */}
                    {contribution > 0n && (
                        <div className="contribution-banner">
                            <span style={{ fontSize: '1.25rem' }}>💜</span> You've contributed <strong>{formatEther(contribution)} ETH</strong> to this campaign!
                        </div>
                    )}
                </div>

                {/* Right Column: Donation Card */}
                <div className="campaign-donate-card">
                    <div className="funding-progress-header">
                        <span className="amount-raised"><strong>{formatEther(info.totalFunded)} ETH</strong></span>
                        <span className="amount-target">raised of {formatEther(info.fundingTarget)} ETH goal</span>
                    </div>

                    <div className="progress-bar" style={{ height: '10px', borderRadius: '5px', marginBottom: '1rem' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, borderRadius: '5px' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '2rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{contributors.length} donations</span>
                        <span style={{ color: progress >= 100 ? 'var(--success)' : 'var(--text-secondary)', fontWeight: 600 }}>
                            {progress}% Funded
                        </span>
                    </div>

                    {canDonate ? (
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
                                    onChange={e => setDonateAmount(e.target.value)}
                                    required
                                    disabled={isProcessing}
                                />
                            </div>
                            <button className="btn-success large-btn" type="submit" disabled={isProcessing}>
                                {isProcessing ? (
                                    <><div className="spinner-small" /> Processing...</>
                                ) : 'Donate to this Campaign'}
                            </button>
                        </form>
                    ) : (
                        <div className="campaign-closed-message">
                            {info.goalReached ? '🎉 This campaign has successfully reached its funding goal!' : 'This campaign is no longer accepting donations.'}
                        </div>
                    )}

                    {status.error && (
                        <p className="text-danger" style={{ marginTop: '1rem', textAlign: 'center' }}>⚠ {status.error.message}</p>
                    )}

                    {status.isConfirmed && (
                        <p style={{ color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem', fontWeight: 600 }}>
                            ✅ Donation confirmed successfully!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
