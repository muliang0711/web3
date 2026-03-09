import { useNavigate } from 'react-router-dom';

export function DonationSuccessView() {
    const navigate = useNavigate();

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                <h2>Donation Success</h2>
                <p style={{ marginTop: '0.25rem' }}>Your donation has been confirmed</p>
            </div>

            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-input)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                🚧 This page is under development by <strong>ny</strong>
            </div>
        </div>
    );
}
