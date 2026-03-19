import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicClient, useReadContract } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { useCampaign } from '../../hooks/useCampaign';

const USER_REGISTRY_ADDR = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as const;
const USER_REGISTRY_ABI = [
    { type: "function", name: "getUser", inputs: [{ name: "_userAddress", type: "address" }], outputs: [{ type: "tuple", components: [{ name: "name", type: "string" }, { name: "isRegistered", type: "bool" }] }], stateMutability: "view" }
] as const;

function DonationTxRow({ log }: { log: any }) {
    const { info } = useCampaign(log.args.campaign as `0x${string}`);
    const { data: userData } = useReadContract({
        address: USER_REGISTRY_ADDR, abi: USER_REGISTRY_ABI, functionName: 'getUser',
        args: [log.args.user as `0x${string}`], query: { enabled: !!log.args.user }
    });

    const isReg = userData ? (userData as any).isRegistered : false;
    const nameStr = userData ? (userData as any).name : "";
    const userName = isReg && nameStr ? nameStr : (log.args.user?.slice(0, 6) + '...');
    const campaignName = info ? info.title : (log.args.campaign?.slice(0, 6) + '...');
    const dateStr = new Date(Number(log.args.timestamp) * 1000).toLocaleString();
    const ethAmount = formatEther(log.args.amount || 0n);
    const points = (Number(ethAmount) * 100).toFixed(0);

    return (
        <div className="history-item" style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <div className="history-item-icon">💸</div>
            <div className="history-item-content">
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <strong>{userName}</strong> at {dateStr} donate <strong>{ethAmount} ETH</strong> to <strong>{campaignName}</strong> and gain <strong>{points}</strong> points.
                </p>
            </div>
        </div>
    );
}

type FilterMode = 'all' | 'user' | 'campaign';

export function UserTransactionsView() {
    const navigate = useNavigate();
    const publicClient = usePublicClient();
    const [donations, setDonations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [filterValue, setFilterValue] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        if (!publicClient) return;
        const fetchDonations = async () => {
            try {
                const logs = await publicClient.getLogs({
                    address: USER_REGISTRY_ADDR,
                    event: parseAbiItem('event DonationRecorded(address indexed user, address indexed campaign, uint256 amount, uint256 timestamp)'),
                    fromBlock: 0n, toBlock: 'latest'
                });
                setDonations(logs.reverse());
            } catch (e) { console.error(e); }
            finally { setIsLoading(false); }
        };
        fetchDonations();
        const inv = setInterval(fetchDonations, 5000);
        return () => clearInterval(inv);
    }, [publicClient]);

    const filtered = donations.filter(log => {
        if (filterMode === 'user' && filterValue) {
            if (!log.args.user?.toLowerCase().includes(filterValue.toLowerCase())) return false;
        }
        if (filterMode === 'campaign' && filterValue) {
            if (!log.args.campaign?.toLowerCase().includes(filterValue.toLowerCase())) return false;
        }
        const ts = Number(log.args.timestamp) * 1000;
        if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
        if (dateTo && ts > new Date(dateTo + 'T23:59:59').getTime()) return false;
        return true;
    });

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>← Back</button>
            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📊</div>
                <h2>Transaction Explorer</h2>
                <p style={{ marginTop: '0.25rem' }}>All donation transactions on the platform</p>
            </div>

            {/* Filter Controls */}
            <div style={{ maxWidth: '800px', margin: '0 auto 1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <button className={filterMode === 'all' ? 'btn-primary' : 'btn-ghost'} onClick={() => { setFilterMode('all'); setFilterValue(''); }} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>All</button>
                    <button className={filterMode === 'user' ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilterMode('user')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>By User</button>
                    <button className={filterMode === 'campaign' ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilterMode('campaign')} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>By Campaign</button>
                </div>
                {filterMode !== 'all' && (
                    <input className="input" placeholder={filterMode === 'user' ? 'User address (0x...)' : 'Campaign address (0x...)'} value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{ marginBottom: '0.75rem' }} />
                )}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>From</label>
                        <input className="input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>To</label>
                        <input className="input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Results */}
            <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{filtered.length} transaction(s) found</p>
                <div className="history-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    {isLoading ? (
                        <div className="text-center" style={{ padding: '2rem 0' }}><div className="spinner" /></div>
                    ) : filtered.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No transactions match your filter.</p>
                    ) : (
                        filtered.map((log, i) => <DonationTxRow key={i} log={log} />)
                    )}
                </div>
            </div>
        </div>
    );
}
