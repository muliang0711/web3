import { useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';
import { REWARD_MANAGER_ADDRESS } from '../../lib/contracts';

const REWARD_MANAGER_ABI = [
    { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' }
] as const;

function DonationRecordRow({ record }: { record: any }) {
    const campaignAddr = record.campaign_address;
    const { info } = useCampaign(campaignAddr as `0x${string}`);
    const date = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown time';
    const amountEth = Number(record.amount_eth || 0);
    const tokensEarned = amountEth;

    return (
        <div className="history-item">
            <div className="history-item-icon">⭐</div>
            <div className="history-item-content">
                <p className="history-item-text" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    On <strong>{date}</strong>, you donated <strong>{amountEth.toFixed(4)} ETH</strong> to <strong>{info ? info.title : (campaignAddr?.slice(0, 6) + '...')}</strong>
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
    const { user, donations, refetchUser, status: userStatus } = useUserRegistry();
    const { campaigns } = useCampaignFactory();
    const navigate = useNavigate();

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    const displayRewards = Number(user?.claimableRewards ?? 0).toFixed(4);
    const hasRewards = Number(user?.claimableRewards ?? 0) > 0;

    useEffect(() => {
        if (!isSuccess) {
            return;
        }

        void refetchUser();
    }, [isSuccess, refetchUser]);

    const handleClaim = () => {
        if (!hasRewards) return;

        writeContract({
            address: REWARD_MANAGER_ADDRESS,
            abi: REWARD_MANAGER_ABI,
            functionName: 'claimRewards',
        });
    };

    const totalDonated = donations.reduce((acc, current: any) => acc + Number(current.amount_eth || 0), 0);

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/dashboard')}>
                ← Back
            </button>

            <div className="text-center" style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👤</div>
                <h2>{user?.name || 'Anonymous Donor'}</h2>
                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {address}
                </p>
            </div>

            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="stat-card">
                    <span className="stat-value">{campaigns.length}</span>
                    <span className="stat-label">Campaigns Available</span>
                </div>

                <div className="stat-card">
                    <span className="stat-value accent">💎 {totalDonated.toFixed(4)} ETH</span>
                    <span className="stat-label">Total Lifetime Donated</span>
                </div>

                <div className="stat-card" style={{
                    background: hasRewards ? 'rgba(108, 92, 231, 0.1)' : 'var(--bg-card)',
                    border: hasRewards ? '1px solid var(--primary)' : '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
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
                        {donations.map((record, idx) => (
                            <DonationRecordRow key={record.id || idx} record={record} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
