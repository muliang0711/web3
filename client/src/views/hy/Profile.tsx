import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { useUserRegistry } from '../../hooks/useUserRegistry';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';
import { useCampaign } from '../../hooks/useCampaign';
import { useRefundHistory } from '../../hooks/useRefundHistory';
import { REWARD_MANAGER_ADDRESS } from '../../lib/contracts';

const REWARD_MANAGER_ABI = [
    { type: 'function', name: 'claimRewards', inputs: [], outputs: [], stateMutability: 'nonpayable' }
] as const;

function DonationRecordRow({ record }: { record: any }) {
    const campaignAddr = record.campaign_address;
    const { info } = useCampaign(campaignAddr as `0x${string}`);
    const date = record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown chain time';
    const amountEth = Number(record.amount_eth || 0);
    const points = amountEth;

    return (
        <div className="history-item">
            <div className="history-item-icon">+</div>
            <div className="history-item-content">
                <p className="history-item-text" style={{ fontSize: '0.95rem' }}>
                    Donated <strong>{amountEth.toFixed(4)} ETH</strong> to <strong>{info ? info.title : (campaignAddr?.slice(0, 6) + '...')}</strong>
                </p>
                <p className="history-item-meta">
                    {date}
                </p>
            </div>
            <div className="history-points">
                <strong>+{points.toFixed(4)} CFR</strong>
                <small>points in tx</small>
            </div>
        </div>
    );
}

function RefundRecordRow({ record }: { record: any }) {
    const amount = Number(record.amount_eth ?? record.amount ?? 0);
    const points = amount;

    return (
        <div className="history-item">
            <div className="history-item-icon">-</div>
            <div className="history-item-content">
                <p className="history-item-text" style={{ fontSize: '0.95rem' }}>
                    Refunded <strong>{amount.toFixed(4)} ETH</strong> from <strong>{record.campaign_title}</strong>
                </p>
                <p className="history-item-meta">
                    {record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown chain time'}
                </p>
            </div>
            <div className="history-points negative">
                <strong>-{points.toFixed(4)} CFR</strong>
                <small>points in tx</small>
            </div>
        </div>
    );
}

export function ProfileView() {
    const { address } = useAccount();
    const {
        user,
        donations,
        uploadProfileImage,
        refetchUser,
        status: userStatus,
    } = useUserRegistry();
    const { campaigns, userCampaigns } = useCampaignFactory();
    const { refunds, status: refundStatus } = useRefundHistory(address);
    const navigate = useNavigate();

    const { data: hash, writeContract, isPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
    const [profileImageRefreshKey, setProfileImageRefreshKey] = useState(Date.now());
    const [profileImageFailed, setProfileImageFailed] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const displayRewards = Number(user?.claimableRewards ?? 0).toFixed(4);
    const hasRewards = Number(user?.claimableRewards ?? 0) > 0;
    const totalDonated = useMemo(
        () => donations.reduce((acc, current: any) => acc + Number(current.amount_eth || 0), 0),
        [donations]
    );
    const totalRefunded = useMemo(
        () => refunds.reduce((acc, current: any) => acc + Number(current.amount_eth ?? current.amount ?? 0), 0),
        [refunds]
    );

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

    const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadError(null);
        setProfileImageFailed(false);

        try {
            await uploadProfileImage(file);
            setProfileImageRefreshKey(Date.now());
        } catch (error: any) {
            console.error(error);
            setUploadError(error?.message || 'Failed to upload profile image.');
        } finally {
            event.target.value = '';
        }
    };

    const profileImageSrc = user?.profileImageUrl ? `${user.profileImageUrl}?v=${profileImageRefreshKey}` : null;

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/')}>
                Back to introduction
            </button>

            <section className="profile-shell">
                <div className="profile-hero-card">
                    <div className="profile-avatar-stack">
                        {!profileImageFailed && profileImageSrc ? (
                            <img
                                src={profileImageSrc}
                                alt={`${user?.name || 'User'} profile`}
                                className="profile-avatar-image"
                                onError={() => setProfileImageFailed(true)}
                            />
                        ) : (
                            <div className="profile-avatar-fallback">
                                {(user?.name || 'U').slice(0, 1).toUpperCase()}
                            </div>
                        )}

                        <label className="profile-upload-button">
                            {userStatus.isUploadingProfileImage ? 'Uploading...' : 'Upload photo'}
                            <input type="file" accept="image/*" onChange={handleProfileImageUpload} hidden disabled={userStatus.isUploadingProfileImage} />
                        </label>
                    </div>

                    <div className="profile-hero-copy">
                        <div className="auth-kicker">Participant profile</div>
                        <h2>{user?.name || 'Anonymous donor'}</h2>
                        <p className="profile-wallet">{address}</p>
                        <p>Track donations, refunds, rewards, and your created campaigns in one place.</p>
                        {uploadError && <p className="text-danger">{uploadError}</p>}
                    </div>
                </div>

                <div className="profile-stat-grid">
                    <div className="quick-stat-card">
                        <span className="quick-stat-label">Campaigns available</span>
                        <span className="quick-stat-value">{campaigns.length}</span>
                    </div>
                    <div className="quick-stat-card">
                        <span className="quick-stat-label">Created by you</span>
                        <span className="quick-stat-value">{userCampaigns.length}</span>
                    </div>
                    <div className="quick-stat-card">
                        <span className="quick-stat-label">Total donated</span>
                        <span className="quick-stat-value" style={{ color: 'var(--success)' }}>{totalDonated.toFixed(4)} ETH</span>
                    </div>
                    <div className="quick-stat-card">
                        <span className="quick-stat-label">Total refunded</span>
                        <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>{totalRefunded.toFixed(4)} ETH</span>
                    </div>
                </div>

                <div className="profile-reward-panel">
                    <div>
                        <div className="auth-kicker">Rewards</div>
                        <h3>{displayRewards} CFR available</h3>
                        <p>Reward balance comes from the contract. Donation and refund history below prefer on-chain time over database insert time.</p>
                    </div>
                    <button
                        onClick={handleClaim}
                        disabled={!hasRewards || isPending || isConfirming}
                        className="btn-primary profile-claim-button"
                    >
                        {isPending ? 'Confirming...' : isConfirming ? 'Claiming...' : isSuccess ? 'Claimed' : 'Claim tokens'}
                    </button>
                </div>

                <section className="profile-history-section">
                    <div className="profile-section-heading">
                        <div>
                            <div className="auth-kicker">Donation history</div>
                            <h3>Transaction records</h3>
                            <p>Times shown here prefer the on-chain donation event timestamp.</p>
                        </div>
                    </div>

                    {userStatus.isReadingDonations ? (
                        <div className="text-center" style={{ padding: '2rem 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : donations.length === 0 ? (
                        <div className="empty-state-card">No donation transactions found yet.</div>
                    ) : (
                        <div className="history-list">
                            {donations.map((record, idx) => (
                                <DonationRecordRow key={record.id || idx} record={record} />
                            ))}
                        </div>
                    )}
                </section>

                <section className="profile-history-section">
                    <div className="profile-section-heading">
                        <div>
                            <div className="auth-kicker">Refund history</div>
                            <h3>Refund transaction records</h3>
                            <p>Refund times prefer the block time of the `RefundIssued` event.</p>
                        </div>
                    </div>

                    {refundStatus.isLoading ? (
                        <div className="text-center" style={{ padding: '2rem 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : refunds.length === 0 ? (
                        <div className="empty-state-card">
                            {refundStatus.error || 'No refund records found yet.'}
                        </div>
                    ) : (
                        <div className="history-list">
                            {refunds.map((record, idx) => (
                                <RefundRecordRow key={record.id || idx} record={record} />
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </div>
    );
}
