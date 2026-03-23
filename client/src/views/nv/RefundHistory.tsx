import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicClient } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';

function RefundRow({ log }: { log: any }) {
    const campaignAddr = log.address as `0x${string}`;
    const { info } = useCampaign(campaignAddr);
    const [blockTime, setBlockTime] = useState('');
    const publicClient = usePublicClient();

    useEffect(() => {
        if (!publicClient || !log.blockNumber) return;
        publicClient.getBlock({ blockNumber: log.blockNumber }).then(b => {
            setBlockTime(new Date(Number(b.timestamp) * 1000).toLocaleString());
        }).catch(() => setBlockTime('Unknown'));
    }, [publicClient, log.blockNumber]);

    return (
        <div className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div className="history-item-icon">🔄</div>
            <div className="history-item-content">
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    Refunded <strong>{formatEther(log.args.amount || 0n)} ETH</strong> from <strong>{info ? info.title : (campaignAddr.slice(0, 6) + '...')}</strong>
                </p>
                <p className="history-item-meta" style={{ marginTop: '0.25rem' }}>{blockTime || 'Loading...'}</p>
            </div>
        </div>
    );
}

export function RefundHistoryView() {
    const navigate = useNavigate();
    const publicClient = usePublicClient();
    const { campaigns } = useCampaignFactory();
    const [refundLogs, setRefundLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!publicClient || campaigns.length === 0) {
            setIsLoading(false);
            return;
        }

        const fetchRefunds = async () => {
            try {
                const allLogs: any[] = [];
                for (const camp of campaigns) {
                    const address = camp.address || camp;
                    const logs = await publicClient.getLogs({
                        address: address,
                        event: parseAbiItem('event RefundIssued(address indexed contributor, uint256 amount)'),
                        fromBlock: 0n,
                        toBlock: 'latest',
                    });
                    allLogs.push(...logs);
                }
                setRefundLogs(allLogs.reverse());
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRefunds();
        const inv = setInterval(fetchRefunds, 5000);
        return () => clearInterval(inv);
    }, [publicClient, campaigns]);

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔄</div>
                <h2>Refund History</h2>
                <p style={{ marginTop: '0.25rem' }}>Refunds issued from failed campaigns</p>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                {isLoading ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}><div className="spinner" /></div>
                ) : refundLogs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No refunds issued yet.</p>
                ) : (
                    refundLogs.map((log, i) => <RefundRow key={i} log={log} />)
                )}
            </div>
        </div>
    );
}
