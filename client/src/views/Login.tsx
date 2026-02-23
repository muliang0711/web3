import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function LoginView() {
    const { connect } = useConnect();

    return (
        <div className="fade-in text-center">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚀</div>
            <h1>Crowdfunding Platform</h1>
            <p style={{ margin: '0.75rem 0 2rem' }}>
                Decentralized · Transparent · Trustless
            </p>

            <button
                className="btn-primary"
                onClick={() => connect({ connector: injected() })}
            >
                🦊 Connect Wallet
            </button>

            <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Connect your MetaMask wallet to get started
            </p>
        </div>
    );
}
