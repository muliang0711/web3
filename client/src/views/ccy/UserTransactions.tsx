import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicClient, useReadContract } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { useCampaign } from '../../hooks/useCampaign';

const USER_REGISTRY_ADDR = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const;
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
    const userName = isReg && nameStr ? nameStr : (log.args.user?.slice(0, 6) + '...' + log.args.user?.slice(-4));
    const campaignName = info ? info.title : (log.args.campaign?.slice(0, 6) + '...');
    const dateStr = new Date(Number(log.args.timestamp) * 1000).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const ethAmount = formatEther(log.args.amount || 0n);
    const points = (Number(ethAmount) * 100).toFixed(0);
    const txHash = log.transactionHash ? (log.transactionHash.slice(0, 6) + '...' + log.transactionHash.slice(-4)) : 'Pending';

    return (
        <tr style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s ease', cursor: 'default' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(108, 92, 231, 0.05)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <td style={{ padding: '1.25rem 1rem', fontFamily: 'monospace', color: 'var(--primary-light)', fontWeight: '500' }}>{txHash}</td>
            <td style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)' }}>{dateStr}</td>
            <td style={{ padding: '1.25rem 1rem', fontWeight: '500', color: 'var(--text)' }}>
                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>{userName}</span>
            </td>
            <td style={{ padding: '1.25rem 1rem', color: 'var(--text)' }}>{campaignName}</td>
            <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text)' }}>
                {ethAmount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ETH</span>
            </td>
            <td style={{ padding: '1.25rem 1rem', textAlign: 'right' }}>
                <span style={{ background: 'rgba(0, 184, 148, 0.1)', color: 'var(--success)', padding: '0.4rem 0.8rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600', border: '1px solid rgba(0, 184, 148, 0.2)' }}>
                    +{points} pts
                </span>
            </td>
        </tr>
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

    // Derived Statistics for the Etherscan-style Header
    const totalDonations = donations.length;
    const uniqueDonors = new Set(donations.map(log => log.args.user)).size;
    const totalVolumeWei = donations.reduce((acc, log) => acc + (log.args.amount || 0n), 0n);
    const totalVolumeEth = parseFloat(formatEther(totalVolumeWei)).toFixed(4);

    // Calculate the Largest Single Donation dynamically
    let topDonationWei = 0n;
    let topDonor = "None";
    donations.forEach(log => {
        const amt = log.args.amount || 0n;
        if (amt > topDonationWei) {
            topDonationWei = amt;
            topDonor = log.args.user as string;
        }
    });
    const topDonationEth = topDonationWei > 0n ? parseFloat(formatEther(topDonationWei)).toFixed(4) : "0.0000";
    const topDonorFormatted = topDonor !== "None" ? `${topDonor.slice(0, 6)}...${topDonor.slice(-4)}` : "-";

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
        <div className="fade-in" style={{ paddingBottom: '4rem' }}>
            <button className="btn-back" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1.5rem' }}>← Back to Dashboard</button>
            
            {/* Header Title */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', margin: '0 0 0.2rem 0', letterSpacing: '-0.5px' }}>Transaction Explorer</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Immutable ledger of all platform donations and smart contract interactions.</p>
                </div>
            </div>

            {/* ETHERSCAN-STYLE HERO STATS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* Stat Card 1: Volume */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Volume</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text)' }}>
                        {totalVolumeEth} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ETH</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.25rem' }}>Securely locked in contracts</div>
                </div>

                {/* Stat Card 2: Network Activity */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Activity</span>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.25rem' }}>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{totalDonations}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Txs</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>{uniqueDonors}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unique Donors</div>
                        </div>
                    </div>
                </div>

                {/* Stat Card 3: Largest Donation */}
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Largest Single Donation</span>
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text)' }}>
                        {topDonationEth} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ETH</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-light)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        From: {topDonorFormatted}
                    </div>
                </div>
            </div>

            {/* Main Interface Container (The Table) */}
            <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                
                {/* Control Panel (Top Bar) */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                    
                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-input)', padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button className={filterMode === 'all' ? 'btn-primary' : 'btn-ghost'} onClick={() => { setFilterMode('all'); setFilterValue(''); }} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', boxShadow: filterMode === 'all' ? '0 4px 12px rgba(108, 92, 231, 0.3)' : 'none' }}>All Activity</button>
                        <button className={filterMode === 'user' ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilterMode('user')} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', boxShadow: filterMode === 'user' ? '0 4px 12px rgba(108, 92, 231, 0.3)' : 'none' }}>By Wallet</button>
                        <button className={filterMode === 'campaign' ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilterMode('campaign')} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none', boxShadow: filterMode === 'campaign' ? '0 4px 12px rgba(108, 92, 231, 0.3)' : 'none' }}>By Campaign</button>
                    </div>

                    {filterMode !== 'all' && (
                        <div style={{ flex: 1, minWidth: '280px' }}>
                            <input className="input" placeholder={filterMode === 'user' ? 'Paste Wallet Address (0x...)' : 'Paste Campaign Address (0x...)'} value={filterValue} onChange={e => setFilterValue(e.target.value)} style={{ width: '100%', margin: 0, borderRadius: '10px' }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>From</span>
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', cursor: 'pointer' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>To</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', cursor: 'pointer' }} />
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div style={{ overflowX: 'auto', width: '100%', minHeight: '300px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tx Hash</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Timestamp</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sender (Donor)</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Contract (Campaign)</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Value</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Rewards</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '6rem 0', textAlign: 'center' }}>
                                        <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px', borderWidth: '4px' }}></div>
                                        <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem', fontWeight: '500' }}>Querying the Blockchain...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                /* PREMIUM EMPTY STATE */
                                <tr>
                                    <td colSpan={6} style={{ whiteSpace: 'normal' }}>
                                        <div style={{ padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            
                                            {/* Abstract Web3 Search Icon */}
                                            <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                                <div style={{ position: 'absolute', inset: 0, background: 'var(--primary)', opacity: 0.1, borderRadius: '20px', transform: 'rotate(15deg)' }}></div>
                                                <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(108, 92, 231, 0.3)', borderRadius: '20px', transform: 'rotate(-10deg)' }}></div>
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="11" cy="11" r="8"></circle>
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                                    <path d="M8 11h6"></path>
                                                </svg>
                                            </div>
                                            
                                            <h3 style={{ color: 'var(--text)', fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                                                No Transactions Found
                                            </h3>
                                            
                                            {/* Fixed Centering on Text */}
                                            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6', textAlign: 'center', fontSize: '0.95rem' }}>
                                                We couldn't find any on-chain data matching your current filters. Adjust your search parameters or clear filters to view the full ledger.
                                            </p>

                                            {/* Smart Call to Action Button */}
                                            {(filterMode !== 'all' || filterValue !== '' || dateFrom !== '' || dateTo !== '') ? (
                                                <button 
                                                    onClick={() => { setFilterMode('all'); setFilterValue(''); setDateFrom(''); setDateTo(''); }}
                                                    style={{ marginTop: '1.5rem', padding: '0.6rem 1.5rem', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary-light)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s ease' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(108, 92, 231, 0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                >
                                                    Clear All Filters
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => navigate('/dashboard')}
                                                    style={{ marginTop: '1.5rem', padding: '0.6rem 1.5rem', background: 'rgba(108, 92, 231, 0.1)', border: 'none', color: 'var(--primary-light)', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s ease' }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(108, 92, 231, 0.2)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(108, 92, 231, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                >
                                                    Explore Campaigns
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((log, i) => <DonationTxRow key={i} log={log} />)
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Count */}
                <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> transaction(s)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block', boxShadow: '0 0 8px var(--success)' }}></span>
                        Synced with Local Node
                    </span>
                </div>
            </div>
        </div>
    );
}
