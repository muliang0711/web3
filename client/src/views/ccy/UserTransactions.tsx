import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { supabase } from '../../lib/supabase';

type FilterMode = 'all' | 'user' | 'campaign';

function formatAddress(value?: string) {
    if (!value) return '-';
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function UserTransactionsView() {
    const navigate = useNavigate();
    const { campaigns } = useCampaignFactory();
    const [donations, setDonations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [filterValue, setFilterValue] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [userNames, setUserNames] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchDonations = async () => {
            try {
                const { data, error } = await supabase
                    .from('donations')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setDonations(data ?? []);
            } catch (e) {
                console.error(e);
                setDonations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDonations();
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            const addresses = Array.from(new Set(donations.map(donation => donation.donor_address).filter(Boolean)));

            if (addresses.length === 0) {
                setUserNames({});
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('wallet_address, name')
                    .in('wallet_address', addresses);

                if (error) throw error;

                setUserNames(Object.fromEntries((data ?? []).map((user: any) => [user.wallet_address, user.name])));
            } catch (e) {
                console.error(e);
                setUserNames({});
            }
        };

        fetchUsers();
    }, [donations]);

    const campaignMap = useMemo(
        () => Object.fromEntries(campaigns.map(campaign => [campaign.address, campaign.title || formatAddress(campaign.address)])),
        [campaigns]
    );

    const totalDonations = donations.length;
    const uniqueDonors = new Set(donations.map(donation => donation.donor_address)).size;
    const totalVolumeEth = donations.reduce((acc, donation) => acc + Number(donation.amount_eth || 0), 0).toFixed(4);

    const topDonation = donations.reduce((top, donation) => {
        const amount = Number(donation.amount_eth || 0);
        return amount > top.amount ? { amount, donor: donation.donor_address } : top;
    }, { amount: 0, donor: '' });

    const filtered = donations.filter(donation => {
        if (filterMode === 'user' && filterValue) {
            if (!donation.donor_address?.toLowerCase().includes(filterValue.toLowerCase())) return false;
        }

        if (filterMode === 'campaign' && filterValue) {
            if (!donation.campaign_address?.toLowerCase().includes(filterValue.toLowerCase())) return false;
        }

        const ts = donation.created_at ? new Date(donation.created_at).getTime() : 0;
        if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
        if (dateTo && ts > new Date(`${dateTo}T23:59:59`).getTime()) return false;
        return true;
    });

    return (
        <div className="fade-in" style={{ paddingBottom: '4rem' }}>
            <button className="btn-back" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1.5rem' }}>← Back to Dashboard</button>

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', margin: '0 0 0.2rem 0', letterSpacing: '-0.5px' }}>Transaction Explorer</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>Database-backed ledger of platform donations.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform Volume</span>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text)' }}>
                        {totalVolumeEth} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ETH</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.25rem' }}>Computed from database records</div>
                </div>

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Network Activity</span>
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

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Largest Single Donation</span>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--text)' }}>
                        {topDonation.amount.toFixed(4)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ETH</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-light)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        From: {topDonation.donor ? formatAddress(topDonation.donor) : '-'}
                    </div>
                </div>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-input)', padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button className={filterMode === 'all' ? 'btn-primary' : 'btn-ghost'} onClick={() => { setFilterMode('all'); setFilterValue(''); }} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none' }}>All Activity</button>
                        <button className={filterMode === 'user' ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilterMode('user')} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none' }}>By Wallet</button>
                        <button className={filterMode === 'campaign' ? 'btn-primary' : 'btn-ghost'} onClick={() => setFilterMode('campaign')} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: 'none' }}>By Campaign</button>
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

                <div style={{ overflowX: 'auto', width: '100%', minHeight: '300px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <thead style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Created</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sender (Donor)</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Campaign</th>
                                <th style={{ padding: '1rem', fontWeight: '600', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'right' }}>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: '6rem 0', textAlign: 'center' }}>
                                        <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px', borderWidth: '4px' }}></div>
                                        <p style={{ color: 'var(--text-secondary)', marginTop: '1.5rem', fontWeight: '500' }}>Querying the database...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ whiteSpace: 'normal' }}>
                                        <div style={{ padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                            <h3 style={{ color: 'var(--text)', fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                                                No Transactions Found
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', lineHeight: '1.6', textAlign: 'center', fontSize: '0.95rem' }}>
                                                We couldn't find any database records matching your current filters.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((donation, i) => (
                                    <tr key={donation.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)' }}>
                                            {donation.created_at ? new Date(donation.created_at).toLocaleString() : 'Unknown'}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', fontWeight: '500', color: 'var(--text)' }}>
                                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                {userNames[donation.donor_address] || formatAddress(donation.donor_address)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', color: 'var(--text)' }}>
                                            {campaignMap[donation.campaign_address] || formatAddress(donation.campaign_address)}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--text)' }}>
                                            {Number(donation.amount_eth || 0).toFixed(4)} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>ETH</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                        Showing <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> transaction(s)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Synced with database
                    </span>
                </div>
            </div>
        </div>
    );
}
