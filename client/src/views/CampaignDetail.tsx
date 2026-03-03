import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useCampaign } from '../hooks/useCampaign';

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
        <div className="fade-in">
            {/* Back button */}
            <button className="btn-back" onClick={() => navigate('/campaigns')}>
                ← Back
            </button>

            {/* Campaign Header */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h2 style={{ flex: 1, margin: 0 }}>{info.title}</h2>
                    <span className={`campaign-card-badge ${info.goalReached ? 'badge-success' : isExpired ? 'badge-danger' : 'badge-active'}`}>
                        {info.goalReached ? '✅ Funded' : isExpired ? '❌ Ended' : '🟢 Active'}
                    </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {info.description}
                </p>
                <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    Creator: {info.creator.slice(0, 6)}...{info.creator.slice(-4)}
                    {isCreator && <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>(You)</span>}
                </p>
            </div>

            {/* Progress */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div className="progress-bar" style={{ height: '12px', borderRadius: '6px' }}>
                    <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%`, borderRadius: '6px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text)' }}>{formatEther(info.totalFunded)}</strong> / {formatEther(info.fundingTarget)} ETH
                    </span>
                    <span style={{ color: progress >= 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                        {progress}%
                    </span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <span className="stat-value">{contributors.length}</span>
                    <span className="stat-label">Contributors</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{deadlineDate.toLocaleDateString()}</span>
                    <span className="stat-label">Deadline</span>
                </div>
            </div>

            {/* Your Contribution */}
            {contribution > 0n && (
                <div style={{
                    padding: '1rem',
                    background: 'rgba(108, 92, 231, 0.1)',
                    border: '1px solid rgba(108, 92, 231, 0.3)',
                    borderRadius: '12px',
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem',
                }}>
                    💜 You've contributed <strong>{formatEther(contribution)} ETH</strong> to this campaign
                </div>
            )}

            {/* Donate Form */}
            {canDonate && (
                <form onSubmit={handleDonate} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <input
                        className="input"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Amount in ETH"
                        value={donateAmount}
                        onChange={e => setDonateAmount(e.target.value)}
                        required
                        disabled={isProcessing}
                        style={{ flex: 1 }}
                    />
                    <button className="btn-success" type="submit" disabled={isProcessing} style={{ width: 'auto', padding: '0.85rem 1.5rem' }}>
                        {isProcessing ? '⏳' : '💰 Donate'}
                    </button>
                </form>
            )}

            {!canDonate && !info.goalReached && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-input)', borderRadius: '12px' }}>
                    This campaign is no longer accepting donations.
                </div>
            )}

            {status.error && (
                <p className="text-danger" style={{ marginTop: '0.5rem' }}>⚠ {status.error.message}</p>
            )}

            {status.isConfirmed && (
                <p style={{ color: 'var(--success)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>
                    ✅ Donation confirmed!
                </p>
            )}
        </div>
    );
}
