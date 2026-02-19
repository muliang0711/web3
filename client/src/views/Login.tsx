import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function LoginView() {
    const { connect } = useConnect();

    return (
        <div style={{ textAlign: 'center' }}>
            <h1>Welcome to User Registry</h1>
            <p>Please connect your wallet to enter the DApp.</p>
            <button
                onClick={() => connect({ connector: injected() })}
                style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Connect Wallet
            </button>
        </div>
    );
}
