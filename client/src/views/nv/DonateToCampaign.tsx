import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

function CampaignOption({ addr, selected, onSelect }: { addr: `0x${string}`, selected: boolean, onSelect: () => void }) {
    const { info } = useCampaign(addr);
    if (!info) return null;
    const isExpired = new Date(Number(info.deadline) * 1000) < new Date();
    const canDonate = !isExpired && !info.goalReached && !info.isCancelled;
    if (!canDonate) return null;

    return (
        <button
            type="button"
            onClick={onSelect}
            style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem',
                background: selected ? 'rgba(108,92,231,0.2)' : 'var(--bg-input)',
                border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '10px', marginBottom: '0.5rem', cursor: 'pointer', transition: '0.2s'
            }}
        >
            <strong>{info.title}</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {formatEther(info.totalFunded)} / {formatEther(info.fundingTarget)} ETH
            </p>
        </button>
    );
}

export function DonateToCampaignView() {
    const navigate = useNavigate();
    const { campaigns, status: factoryStatus } = useCampaignFactory();
    const [selectedCampaign, setSelectedCampaign] = useState<`0x${string}` | null>(null);
    const [amount, setAmount] = useState('');

    const { contribute, status: campaignStatus } = useCampaign(selectedCampaign || undefined);
    const isProcessing = campaignStatus.isContributing || campaignStatus.isConfirming;

    const handleDonate = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedCampaign && amount && Number(amount) > 0) {
            contribute(amount);
        }
    };

    // Redirect to success page after confirmation
    if (campaignStatus.isConfirmed && selectedCampaign) {
        navigate(`/donation-success?campaign=${selectedCampaign}&amount=${amount}`);
    }

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💰</div>
                <h2>Donate to Campaign</h2>
                <p style={{ marginTop: '0.25rem' }}>Choose a campaign and make a donation</p>
            </div>

            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>1. Select a Campaign</h4>
                {factoryStatus.isLoadingCampaigns ? (
                    <div className="text-center" style={{ padding: '1rem' }}><div className="spinner" /></div>
                ) : campaigns.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No active campaigns available.</p>
                ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                        {campaigns.map(addr => (
                            <CampaignOption key={addr} addr={addr} selected={selectedCampaign === addr} onSelect={() => setSelectedCampaign(addr)} />
                        ))}
                    </div>
                )}

                {selectedCampaign && (
                    <form onSubmit={handleDonate}>
                        <h4 style={{ marginBottom: '0.75rem' }}>2. Enter Amount</h4>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                className="input" type="number" step="0.01" min="0.01"
                                placeholder="Amount in ETH" value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required disabled={isProcessing} style={{ flex: 1 }}
                            />
                            <button className="btn-success" type="submit" disabled={isProcessing} style={{ padding: '0.85rem 1.5rem' }}>
                                {isProcessing ? '⏳ Donating...' : '🚀 Donate'}
                            </button>
                        </div>
                        {campaignStatus.error && (
                            <p className="text-danger" style={{ marginTop: '0.5rem' }}>⚠ {campaignStatus.error.message}</p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
