import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';

export function CreateCampaignView() {
    const { createCampaign, status } = useCampaignFactory();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [target, setTarget] = useState('');
    const [duration, setDuration] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim() && description.trim() && target && duration) {
            createCampaign(title.trim(), description.trim(), target, Number(duration));
        }
    };

    // Note: React 18 strict mode + wagmi hooks might cause double triggers if we navigate immediately,
    // but a standard pattern is to listen to confirmation
    useEffect(() => {
        if (status.isConfirmed) {
            navigate('/campaigns');
        }
    }, [status.isConfirmed, navigate]);

    const isProcessing = status.isCreating || status.isConfirming;

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
            </button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>➕</div>
                <h2>Create Campaign</h2>
                <p style={{ marginTop: '0.25rem' }}>Set up a new crowdfunding campaign</p>
            </div>

            <form onSubmit={handleCreate} className="create-form" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
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
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn-success" type="submit" disabled={isProcessing} style={{ flex: 1, padding: '1rem' }}>
                        {isProcessing ? '⏳ Creating...' : '🚀 Create Campaign'}
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => navigate('/campaigns')} disabled={isProcessing} style={{ padding: '1rem' }}>
                        Cancel
                    </button>
                </div>
                {status.error && (
                    <p className="text-danger" style={{ marginTop: '0.5rem', textAlign: 'center' }}>⚠ {status.error.message}</p>
                )}
            </form>
        </div>
    );
}
