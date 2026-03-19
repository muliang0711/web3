import { useNavigate, useSearchParams } from 'react-router-dom';

export function DonationSuccessView() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const campaign = searchParams.get('campaign') || '';
    const amount = searchParams.get('amount') || '0';
    const points = (Number(amount) * 100).toFixed(0);

    return (
        <div className="fade-in">
            <div className="text-center" style={{ padding: '2rem 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h2>Donation Successful!</h2>
                <p style={{ marginTop: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                    Your contribution has been confirmed on-chain.
                </p>

                <div style={{ maxWidth: '400px', margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1.5rem', textAlign: 'left' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Donated</span>
                        <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{amount} ETH</p>
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Points Earned</span>
                        <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffc107' }}>🏆 {points} Points</p>
                    </div>
                    {campaign && (
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Campaign</span>
                            <p style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{campaign.slice(0, 10)}...{campaign.slice(-8)}</p>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '2rem' }}>
                    <button className="btn-primary" onClick={() => navigate('/profile')}>👤 View Profile</button>
                    <button className="btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                </div>
            </div>
        </div>
    );
}
