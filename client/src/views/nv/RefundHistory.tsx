import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export function RefundHistoryView() {
    const navigate = useNavigate();
    const [refunds, setRefunds] = useState<any[]>([]);
    const [campaignTitles, setCampaignTitles] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [dbMessage, setDbMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchRefunds = async () => {
            try {
                const { data, error } = await supabase
                    .from('refunds')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setRefunds(data ?? []);
            } catch (e: any) {
                console.error(e);
                setRefunds([]);
                setDbMessage('No refund records table is available in the database yet.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRefunds();
    }, []);

    const campaignAddresses = useMemo(
        () => Array.from(new Set(refunds.map(refund => refund.campaign_address || refund.campaign).filter(Boolean))),
        [refunds]
    );

    useEffect(() => {
        const fetchCampaigns = async () => {
            if (campaignAddresses.length === 0) {
                setCampaignTitles({});
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('campaigns')
                    .select('address, title')
                    .in('address', campaignAddresses);

                if (error) throw error;
                setCampaignTitles(Object.fromEntries((data ?? []).map((campaign: any) => [campaign.address, campaign.title])));
            } catch (e) {
                console.error(e);
                setCampaignTitles({});
            }
        };

        fetchCampaigns();
    }, [campaignAddresses]);

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔄</div>
                <h2>Refund History</h2>
                <p style={{ marginTop: '0.25rem' }}>Refund records loaded from the database</p>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                {isLoading ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}><div className="spinner" /></div>
                ) : refunds.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                        {dbMessage || 'No refunds issued yet.'}
                    </p>
                ) : (
                    refunds.map((refund, i) => {
                        const campaignAddress = refund.campaign_address || refund.campaign;
                        const title = campaignTitles[campaignAddress] || `${String(campaignAddress).slice(0, 6)}...`;
                        const amount = Number(refund.amount_eth ?? refund.amount ?? 0).toFixed(4);

                        return (
                            <div key={refund.id || i} className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                <div className="history-item-icon">🔄</div>
                                <div className="history-item-content">
                                    <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                        Refunded <strong>{amount} ETH</strong> from <strong>{title}</strong>
                                    </p>
                                    <p className="history-item-meta" style={{ marginTop: '0.25rem' }}>
                                        {refund.created_at ? new Date(refund.created_at).toLocaleString() : 'Unknown time'}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
