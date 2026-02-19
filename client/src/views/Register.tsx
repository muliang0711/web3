import { useState } from 'react';
import { useUserRegistry } from '../hooks/useUserRegistry';

export function RegisterView() {
    const [name, setName] = useState('');
    const { register, status } = useUserRegistry();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            register(name);
        }
    };

    return (
        <div style={{ textAlign: 'center' }}>
            <h2>Create account</h2>
            <p>You are new here. Please register to continue.</p>
            <form onSubmit={handleRegister}>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                        padding: '10px',
                        margin: '10px 0',
                        width: '80%',
                        borderRadius: '4px',
                        border: '1px solid #ccc'
                    }}
                />
                <br />
                <button
                    type="submit"
                    disabled={status.isRegistering || status.isConfirming}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {status.isRegistering || status.isConfirming ? 'Processing...' : 'Register'}
                </button>
            </form>
            {status.error && (
                <p style={{ color: 'red', fontSize: '12px', marginTop: '10px' }}>
                    Error: {status.error.message}
                </p>
            )}
        </div>
    );
}
