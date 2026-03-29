import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { supabase } from '../../lib/supabase';

function CampaignHistoryRow({ campaign, creatorName }: { campaign: any; creatorName?: string }) {
    const userName = creatorName || `${campaign.creator?.slice(0, 6) || '0x0000'}...`;
    const target = Number(campaign.target_eth || 0).toFixed(4);

    return (
        <div className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div className="history-item-icon">📜</div>
            <div className="history-item-content">
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <strong>{userName}</strong> created <strong>{campaign.title}</strong> targeting <strong>{target} ETH</strong>
                </p>
                <p className="history-item-meta" style={{ marginTop: '0.25rem' }}>
                    on {campaign.created_at ? new Date(campaign.created_at).toLocaleString() : 'Unknown date'}
                </p>
            </div>
        </div>
    );
}

export function CampaignHistoryView() {
    const navigate = useNavigate();
    const { campaigns, status } = useCampaignFactory();
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    const creatorAddresses = useMemo(
        () => Array.from(new Set(campaigns.map(campaign => campaign.creator).filter(Boolean))),
        [campaigns]
    );

    useEffect(() => {
        const fetchNames = async () => {
            if (creatorAddresses.length === 0) {
                setUserNames({});
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('wallet_address, name')
                    .in('wallet_address', creatorAddresses);

                if (error) throw error;

                const mapped = Object.fromEntries((data ?? []).map((user: any) => [user.wallet_address, user.name]));
                setUserNames(mapped);
            } catch (e) {
                console.error(e);
                setUserNames({});
            }
        };

        fetchNames();
    }, [creatorAddresses]);

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
                <h2>Campaign History</h2>
                <p style={{ marginTop: '0.25rem' }}>View all campaigns created on the platform</p>
            </div>

            <div className="history-list" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                {status.isLoadingCampaigns ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}><div className="spinner" /></div>
                ) : campaigns.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns have been created yet.</p>
                ) : (
                    campaigns.map((campaign, i) => (
                        <CampaignHistoryRow
                            key={campaign.address || i}
                            campaign={campaign}
                            creatorName={campaign.creator ? userNames[campaign.creator] : undefined}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
