import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaignFactory } from '../hooks/useCampaignFactory';
import { useCampaign } from '../hooks/useCampaign';

// Sub-component: renders one campaign card
function CampaignCard({ campaignAddress }: { campaignAddress: `0x${string}` }) {
    const { info } = useCampaign(campaignAddress);
    const navigate = useNavigate();

    if (!info) {
        return (
            <div className="campaign-card" style={{ opacity: 0.5 }}>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            </div>
        );
    }

    const progress = info.fundingTarget > 0n
        ? Number((info.totalFunded * 100n) / info.fundingTarget)
        : 0;

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();

    return (
        <button
            className="campaign-card"
            onClick={() => navigate(`/campaigns/${campaignAddress}`)}
        >
            <div className="campaign-card-header">
                <h4 className="campaign-card-title">{info.title}</h4>
                <span className={`campaign-card-badge ${info.goalReached ? 'badge-success' : isExpired ? 'badge-danger' : 'badge-active'}`}>
                    {info.goalReached ? '✅ Funded' : isExpired ? '❌ Ended' : '🟢 Active'}
                </span>
            </div>

            <p className="campaign-card-desc">{info.description}</p>

            <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
            </div>

            <div className="campaign-card-stats">
                <span>{formatEther(info.totalFunded)} / {formatEther(info.fundingTarget)} ETH</span>
                <span>{progress}%</span>
            </div>
        </button>
    );
}

export function CampaignsView() {
    const { campaigns, createCampaign, status } = useCampaignFactory();
    const navigate = useNavigate();
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [target, setTarget] = useState('');
    const [duration, setDuration] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && description.trim() && target && duration) {
            createCampaign(title.trim(), description.trim(), target, Number(duration));
            setTitle('');
            setDescription('');
            setTarget('');
            setDuration('');
            setShowForm(false);
        }
    };

    const isProcessing = status.isCreating || status.isConfirming;

    return (
        <div className="fade-in">
            {/* Back button */}
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            {/* Header */}
            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
                <h2>Campaigns</h2>
                <p style={{ marginTop: '0.25rem' }}>Browse or create crowdfunding campaigns</p>
            </div>

            {/* Create Campaign Button / Form */}
            {!showForm ? (
                <button
                    className="btn-primary"
                    onClick={() => setShowForm(true)}
                    style={{ marginBottom: '1.5rem' }}
                >
                    ➕ Create New Campaign
                </button>
            ) : (
                <form onSubmit={handleCreate} className="create-form" style={{ marginBottom: '1.5rem' }}>
                    <div className="form-group">
                        <label>Title</label>
                        <input className="input" placeholder="Campaign title" value={title} onChange={e => setTitle(e.target.value)} required disabled={isProcessing} />
                    </div>
                    <div className="form-group">
                        <label>Description</label>
                        <input className="input" placeholder="What's this campaign about?" value={description} onChange={e => setDescription(e.target.value)} required disabled={isProcessing} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label>Target (ETH)</label>
                            <input className="input" type="number" step="0.01" min="0.01" placeholder="10" value={target} onChange={e => setTarget(e.target.value)} required disabled={isProcessing} />
                        </div>
                        <div className="form-group">
                            <label>Duration (days)</label>
                            <input className="input" type="number" min="1" placeholder="30" value={duration} onChange={e => setDuration(e.target.value)} required disabled={isProcessing} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn-success" type="submit" disabled={isProcessing} style={{ flex: 1 }}>
                            {isProcessing ? '⏳ Creating...' : '🚀 Create'}
                        </button>
                        <button type="button" className="btn-ghost" onClick={() => setShowForm(false)} disabled={isProcessing}>
                            Cancel
                        </button>
                    </div>
                    {status.error && (
                        <p className="text-danger" style={{ marginTop: '0.5rem' }}>⚠ {status.error.message}</p>
                    )}
                </form>
            )}

            {/* Campaign List */}
            {status.isLoadingCampaigns ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading campaigns...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    No campaigns yet. Create the first one! 🎉
                </div>
            ) : (
                <div className="campaign-list">
                    {[...campaigns].reverse().map((addr) => (
                        <CampaignCard key={addr} campaignAddress={addr} />
                    ))}
                </div>
            )}
        </div>
    );
}
