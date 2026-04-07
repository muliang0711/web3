import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { supabase } from '../../lib/supabase';
import { fetchRegistrationTimestampsForAddresses } from '../../lib/userRegistration';

export function GlobalHistoryView() {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const publicClient = usePublicClient();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const users = data ?? [];
                const walletAddresses = users.map((user) => user.wallet_address).filter(Boolean);
                const registrationTimes = publicClient
                    ? await fetchRegistrationTimestampsForAddresses(publicClient, walletAddresses).catch((timestampError) => {
                        console.warn('Failed to load chain registration timestamps for global history.', timestampError);
                        return new Map<string, string | null>();
                    })
                    : new Map<string, string | null>();

                const enrichedUsers = users
                    .map((user) => ({
                        ...user,
                        registered_at_chain: registrationTimes.get(String(user.wallet_address).toLowerCase()) ?? user.created_at ?? null,
                    }))
                    .sort((left, right) => {
                        const leftTime = left.registered_at_chain ? new Date(left.registered_at_chain).getTime() : 0;
                        const rightTime = right.registered_at_chain ? new Date(right.registered_at_chain).getTime() : 0;
                        return rightTime - leftTime;
                    });

                setRegistrations(enrichedUsers);
            } catch (err) {
                console.error(err);
                setRegistrations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [publicClient]);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Live Registrations</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Registration time is derived from the on-chain UserRegistered event timestamp.</p>
            </div>

            {isLoading ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading registrations...</p>
                </div>
            ) : registrations.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    No users registered yet.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {registrations.map((user, i) => (
                        <div key={user.wallet_address || i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                                {user.name?.slice(0, 1)?.toUpperCase() || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>{user.name}</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{user.wallet_address}</p>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                                {user.registered_at_chain ? new Date(user.registered_at_chain).toLocaleString() : 'Unknown time'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
