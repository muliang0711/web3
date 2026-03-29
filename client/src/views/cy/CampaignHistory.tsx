import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicClient, useReadContract } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { CAMPAIGN_FACTORY_ADDRESS, USER_REGISTRY_ADDRESS } from '../../lib/contracts';

const USER_REGISTRY_ABI = [
    {
        "type": "function",
        "name": "getUser",
        "inputs": [{ "name": "_userAddress", "type": "address" }],
        "outputs": [{ "type": "tuple", "components": [{ "name": "name", "type": "string" }, { "name": "isRegistered", "type": "bool" }] }],
        "stateMutability": "view"
    }
] as const;

function CampaignHistoryRow({ log }: { log: any }) {
    const { data: userData } = useReadContract({
        address: USER_REGISTRY_ADDRESS,
        abi: USER_REGISTRY_ABI,
        functionName: 'getUser',
        args: [log.args.creator as `0x${string}`],
        query: { enabled: !!log.args.creator }
    });
    
    // Check if user is registered and name is available, otherwise slice address
    const isRegistered = userData ? (userData as any).isRegistered : false;
    const nameStr = userData ? (userData as any).name : "";
    const userName = isRegistered && nameStr ? nameStr : (log.args.creator?.slice(0, 6) + '...');
    const target = formatEther(log.args.fundingTarget || 0n);

    // To get timestamp, we must fetch block.
    const [date, setDate] = useState<string>('Loading time...');
    const publicClient = usePublicClient();
    
    useEffect(() => {
        if (!publicClient || !log.blockNumber) return;
        publicClient.getBlock({ blockNumber: log.blockNumber }).then(b => {
             setDate(new Date(Number(b.timestamp) * 1000).toLocaleString());
        }).catch(e => {
             console.error(e);
             setDate('Unknown date');
        });
    }, [publicClient, log.blockNumber]);

    return (
        <div className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div className="history-item-icon">📜</div>
            <div className="history-item-content">
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <strong>{userName}</strong> created <strong>{log.args.title}</strong> targeting <strong>{target} ETH</strong>
                </p>
                <p className="history-item-meta" style={{ marginTop: '0.25rem' }}>
                    on {date}
                </p>
            </div>
        </div>
    );
}

export function CampaignHistoryView() {
    const navigate = useNavigate();
    const publicClient = usePublicClient();
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!publicClient) return;
        const fetchLogs = () => {
             publicClient.getLogs({
                address: CAMPAIGN_FACTORY_ADDRESS,
                event: parseAbiItem('event CampaignCreated(address indexed campaignAddress, address indexed creator, string title, uint256 fundingTarget, uint256 durationInDays)'),
                fromBlock: 0n,
                toBlock: 'latest'
            }).then(l => {
                setLogs(l.reverse());
                setIsLoading(false);
            }).catch(e => {
                console.error(e);
                setIsLoading(false);
            });
        };
        fetchLogs();
        
        // Polling
        const inv = setInterval(fetchLogs, 5000);
        return () => clearInterval(inv);
        
    }, [publicClient]);

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
                {isLoading ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}><div className="spinner" /></div>
                ) : logs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No campaigns have been created yet.</p>
                ) : (
                    logs.map((log, i) => <CampaignHistoryRow key={i} log={log} />)
                )}
            </div>
        </div>
    );
}
