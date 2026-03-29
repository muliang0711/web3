import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function GlobalHistoryView() {
    const [registrations, setRegistrations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setRegistrations(data ?? []);
            } catch (err) {
                console.error(err);
                setRegistrations([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>Live Registrations</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time view of all users joining the platform</p>
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
                                {user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown time'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
