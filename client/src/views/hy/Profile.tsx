import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';
import { useEffect } from 'react';

// --- ADDED: Smart Contract Info for Claiming ---
const USER_REGISTRY_ADDR = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9" as const;
const USER_REGISTRY_ABI = [
    { type: "function", name: "claimableRewards", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
    { type: "function", name: "claimRewards", inputs: [], outputs: [], stateMutability: "nonpayable" }
] as const;
// ----------------------------------------------

// Sub-component: renders one donation record from history
function DonationRecordRow({ record }: { record: any }) {
    const campaignAddr = record.campaign || record[0];
    const amountVal = record.amount || record[1];
    const timestampVal = record.timestamp || record[2];

    const { info } = useCampaign(campaignAddr as `0x${string}`);
    const date = new Date(Number(timestampVal) * 1000).toLocaleString();
    
    // Updated to reflect the 1:1 CFR Token assignment rule
    const tokensEarned = Number(formatEther(amountVal || 0n)); 

    return (
        <div className="history-item">
            <div className="history-item-icon">⭐</div>
            <div className="history-item-content">
                <p className="history-item-text" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    On <strong>{date}</strong>, you donated <strong>{formatEther(amountVal || 0n)} ETH</strong> to <strong>{info ? info.title : (campaignAddr?.slice(0, 6) + '...')}</strong>
                </p>
                <p className="history-item-meta" style={{ marginTop: '0.25rem', color: '#00b894', fontWeight: 'bold' }}>
                    🏆 Earned {tokensEarned.toFixed(4)} CFR Tokens
                </p>
            </div>
        </div>
    );
}

export function ProfileView() {
    const { address } = useAccount();
    const { user, donations, status: userStatus } = useUserRegistry();
    const { campaigns } = useCampaignFactory();
    const navigate = useNavigate();

    // --- NEW: Web3 Claim Rewards Logic ---
    const { data: claimableAmount, refetch: refetchRewards } = useReadContract({
        address: USER_REGISTRY_ADDR,
        abi: USER_REGISTRY_ABI,
        functionName: 'claimableRewards',
        args: [address as `0x${string}`],
        query: { enabled: !!address }
    });

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isSuccess) refetchRewards(); // Refresh balance after claiming
    }, [isSuccess, refetchRewards]);

    const displayRewards = claimableAmount ? formatEther(claimableAmount as bigint) : "0.0";
    const hasRewards = claimableAmount && (claimableAmount as bigint) > 0n;

    const handleClaim = () => {
        writeContract({
            address: USER_REGISTRY_ADDR,
            abi: USER_REGISTRY_ABI,
            functionName: 'claimRewards',
        });
    };
    // --------------------------------------

    // Calculate total volume donated
    const totalDonated = [...donations].reduce((acc, current: any) => {
        const amountVal = current.amount || current[1] || 0n;
        return acc + Number(formatEther(amountVal));
    }, 0);

    return (
        <div className="fade-in">
            {/* Back button */}
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            {/* Profile header */}
            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👤</div>
                <h2>{user?.name || "Anonymous Donor"}</h2>
                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {address}
                </p>
            </div>

            {/* Stats Grid - Now with 3 Cards including Claim Button! */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                
                <div className="stat-card">
                    <span className="stat-value">{campaigns.length}</span>
                    <span className="stat-label">Campaigns Available</span>
                </div>
                
                <div className="stat-card">
                    <span className="stat-value accent">💎 {totalDonated.toFixed(4)} ETH</span>
                    <span className="stat-label">Total Lifetime Donated</span>
                </div>

                {/* NEW INTERACTIVE CLAIM CARD */}
                <div className="stat-card" style={{ 
                    background: hasRewards ? 'rgba(108, 92, 231, 0.1)' : 'var(--bg-card)', 
                    border: hasRewards ? '1px solid var(--primary)' : '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                    <span className="stat-value" style={{ color: hasRewards ? 'var(--primary)' : 'var(--text)' }}>
                        🎁 {displayRewards} CFR
                    </span>
                    <span className="stat-label">Claimable Rewards</span>
                    
                    <button
                        onClick={handleClaim}
                        disabled={!hasRewards || isPending || isConfirming}
                        style={{
                            marginTop: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: '8px', border: 'none',
                            background: (!hasRewards || isPending || isConfirming) ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                            color: (!hasRewards || isPending || isConfirming) ? 'var(--text-muted)' : 'white',
                            cursor: (!hasRewards || isPending || isConfirming) ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold', transition: 'all 0.2s'
                        }}
                    >
                        {isPending ? 'Confirming...' : isConfirming ? 'Claiming...' : isSuccess ? 'Claimed!' : 'Claim Tokens'}
                    </button>
                </div>

            </div>

            {/* Donation History */}
            <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text)' }}>
                    📜 My Transaction History
                </h3>

                {userStatus.isReadingDonations ? (
                    <div className="text-center" style={{ padding: '2rem 0' }}>
                        <div className="spinner" />
                        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading history...</p>
                    </div>
                ) : donations.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                        No transactions found yet.
                    </div>
                ) : (
                    <div className="history-list">
                        {[...donations].reverse().map((record, idx) => (
                            <DonationRecordRow key={idx} record={record} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
