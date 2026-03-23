import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';
import { formatEther } from 'viem';

function CreatedCampaignRow({ address }: { address: `0x${string}` }) {
    const { info } = useCampaign(address);
    if (!info) return null;
    
    return (
        <div className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div className="history-item-icon">📝</div>
            <div className="history-item-content">
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <strong>{info.title}</strong>
                </p>
                <p className="history-item-meta" style={{ marginTop: '0.25rem' }}>
                    Target: {formatEther(info.fundingTarget)} ETH | Raised: {formatEther(info.totalFunded)} ETH {info.goalReached ? '✅' : '⏳'}
                </p>
            </div>
        </div>
    );
}

export function UserCreatedHistoryView() {
    const navigate = useNavigate();
    const { userCampaigns, status } = useCampaignFactory();

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
                <h2>My Created Campaigns</h2>
                <p style={{ marginTop: '0.25rem' }}>View all campaigns you've created</p>
            </div>

            <div className="history-list" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                {status.isLoadingCampaigns ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}><div className="spinner" /></div>
                ) : userCampaigns.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>You haven't created any campaigns yet.</p>
                ) : (
                    userCampaigns.map((camp) => <CreatedCampaignRow key={camp.address || camp} address={camp.address || camp} />)
                )}
            </div>
        </div>
    );
}
