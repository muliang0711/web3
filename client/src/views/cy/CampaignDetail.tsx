import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { formatEther } from 'viem';
import { useAccount } from 'wagmi';
import { useCampaign } from '../../hooks/useCampaign';
import { supabase } from '../../lib/supabase';

type StoredCampaignRecord = {
    address: `0x${string}`;
    title: string | null;
    description: string | null;
    creator_address: string | null;
    target_eth: string | number | null;
    duration_days: number | null;
    created_at: string | null;
    image_url?: string | null;
    campaign_image_url?: string | null;
    cover_image_url?: string | null;
};

export function CampaignDetailView() {
    const { address: campaignAddress } = useParams<{ address: string }>();
    const { address: userAddress } = useAccount();
    const navigate = useNavigate();
    const [donateAmount, setDonateAmount] = useState('');
    const [imageFailed, setImageFailed] = useState(false);
    const [pendingSuccessAmount, setPendingSuccessAmount] = useState<string | null>(null);
    const [storedCampaign, setStoredCampaign] = useState<StoredCampaignRecord | null>(null);
    const [storedRaised, setStoredRaised] = useState(0);
    const [storedBackers, setStoredBackers] = useState(0);
    const [isLoadingStoredCampaign, setIsLoadingStoredCampaign] = useState(false);

    const {
        info,
        contribution,
        contributors,
        contribute,
        withdrawFunds,
        status,
    } = useCampaign(campaignAddress as `0x${string}` | undefined);

    useEffect(() => {
        let ignore = false;

        if (!campaignAddress) {
            setStoredCampaign(null);
            setStoredRaised(0);
            setStoredBackers(0);
            return;
        }

        const fetchStoredCampaign = async () => {
            setIsLoadingStoredCampaign(true);
            try {
                const [{ data: campaignRow, error: campaignError }, { data: donationRows, error: donationsError }] = await Promise.all([
                    supabase
                        .from('campaigns')
                        .select('*')
                        .eq('address', campaignAddress)
                        .maybeSingle(),
                    supabase
                        .from('donations')
                        .select('amount_eth, donor_address')
                        .eq('campaign_address', campaignAddress),
                ]);

                if (campaignError) throw campaignError;
                if (donationsError) throw donationsError;

                if (ignore) {
                    return;
                }

                setStoredCampaign((campaignRow as StoredCampaignRecord | null) ?? null);
                setStoredRaised((donationRows ?? []).reduce((sum: number, row: any) => sum + Number(row.amount_eth || 0), 0));
                setStoredBackers(new Set((donationRows ?? []).map((row: any) => row.donor_address).filter(Boolean)).size);
            } catch (error) {
                console.error('Failed to load stored campaign detail', error);
                if (!ignore) {
                    setStoredCampaign(null);
                    setStoredRaised(0);
                    setStoredBackers(0);
                }
            } finally {
                if (!ignore) {
                    setIsLoadingStoredCampaign(false);
                }
            }
        };

        void fetchStoredCampaign();

        return () => {
            ignore = true;
        };
    }, [campaignAddress]);

    const handleDonate = (e: React.FormEvent) => {
        e.preventDefault();
        if (donateAmount && Number(donateAmount) > 0) {
            setPendingSuccessAmount(donateAmount);
            contribute(donateAmount);
            setDonateAmount('');
        }
    };

    useEffect(() => {
        if (!campaignAddress || !pendingSuccessAmount || !status.isConfirmed || !status.txHash) {
            return;
        }

        navigate(
            `/campaigns/${campaignAddress}/success?amount=${encodeURIComponent(pendingSuccessAmount)}&tx=${status.txHash}`,
            { replace: true }
        );
    }, [campaignAddress, navigate, pendingSuccessAmount, status.isConfirmed, status.txHash]);

    if (status.isLoadingInfo || isLoadingStoredCampaign) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Loading campaign...</p>
            </div>
        );
    }

    if (!campaignAddress) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <p>Campaign not found.</p>
                <button className="btn-ghost" onClick={() => navigate('/campaigns')} style={{ marginTop: '1rem' }}>
                    Back to campaigns
                </button>
            </div>
        );
    }

    if (!info && storedCampaign) {
        const storedImageUrl = storedCampaign.image_url || storedCampaign.campaign_image_url || storedCampaign.cover_image_url || null;
        const storedDeadline = storedCampaign.created_at && storedCampaign.duration_days
            ? new Date(new Date(storedCampaign.created_at).getTime() + storedCampaign.duration_days * 24 * 60 * 60 * 1000)
            : null;

        return (
            <div className="fade-in campaign-detail-wrapper">
                <button className="btn-back" onClick={() => navigate('/campaigns')}>
                    Back to campaigns
                </button>

                <div className="campaign-detail-grid">
                    <div className="campaign-info-section">
                        <div className="campaign-detail-hero-card">
                            <div className="campaign-detail-media">
                                {storedImageUrl && !imageFailed ? (
                                    <img
                                        src={storedImageUrl}
                                        alt={storedCampaign.title || 'Stored campaign'}
                                        className="media-cover-image"
                                        onError={() => setImageFailed(true)}
                                    />
                                ) : (
                                    <div className="media-cover-placeholder">
                                        <span>{(storedCampaign.title || 'C').slice(0, 1)}</span>
                                        <small>Archived campaign picture</small>
                                    </div>
                                )}
                            </div>

                            <div className="campaign-detail-header">
                                <div className="campaign-detail-title-row">
                                    <h2 style={{ fontSize: '2rem', lineHeight: 1.2 }}>{storedCampaign.title || 'Stored campaign'}</h2>
                                    <span className="campaign-card-badge badge-danger">
                                        Archived
                                    </span>
                                </div>

                                <p className="campaign-detail-desc">
                                    {storedCampaign.description || 'This campaign record is available from Supabase, but its original contract is not deployed on the current chain anymore.'}
                                </p>

                                <div className="campaign-detail-meta-grid">
                                    <div className="campaign-meta-pill">
                                        <span>Creator</span>
                                        <strong>
                                            {storedCampaign.creator_address
                                                ? `${storedCampaign.creator_address.slice(0, 6)}...${storedCampaign.creator_address.slice(-4)}${userAddress?.toLowerCase() === storedCampaign.creator_address.toLowerCase() ? ' (You)' : ''}`
                                                : 'Stored record'}
                                        </strong>
                                    </div>
                                    <div className="campaign-meta-pill">
                                        <span>Deadline</span>
                                        <strong>{storedDeadline ? storedDeadline.toLocaleDateString() : 'Stored record'}</strong>
                                    </div>
                                    <div className="campaign-meta-pill">
                                        <span>Backers</span>
                                        <strong>{storedBackers}</strong>
                                    </div>
                                    <div className="campaign-meta-pill">
                                        <span>Target</span>
                                        <strong>{Number(storedCampaign.target_eth || 0).toFixed(4)} ETH</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="campaign-donate-card">
                        <div className="funding-progress-header">
                            <span className="amount-raised"><strong>{storedRaised.toFixed(4)} ETH</strong></span>
                            <span className="amount-target">stored total of {Number(storedCampaign.target_eth || 0).toFixed(4)} ETH goal</span>
                        </div>

                        <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${Math.min(
                                        100,
                                        Number(storedCampaign.target_eth || 0) > 0
                                            ? (storedRaised / Number(storedCampaign.target_eth || 0)) * 100
                                            : 0
                                    )}%`,
                                }}
                            />
                        </div>

                        <div className="campaign-card-stats" style={{ marginBottom: '1.5rem' }}>
                            <span>{storedBackers} contributors</span>
                            <span>{storedCampaign.duration_days ?? 0} days planned</span>
                        </div>

                        <div className="campaign-closed-message">
                            This campaign was created before the current chain restart. The page is shown from Supabase history, so donations and contract actions are unavailable until the campaign is redeployed on the current chain.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!info) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <p>Campaign not found.</p>
                <button className="btn-ghost" onClick={() => navigate('/campaigns')} style={{ marginTop: '1rem' }}>
                    Back to campaigns
                </button>
            </div>
        );
    }

    const progress = info.fundingTarget > 0n
        ? Number((info.totalFunded * 100n) / info.fundingTarget)
        : 0;

    const deadlineDate = new Date(Number(info.deadline) * 1000);
    const isExpired = deadlineDate < new Date();
    const canDonate = !isExpired && !info.goalReached && !info.isCancelled;
    const isCreator = userAddress?.toLowerCase() === info.creator.toLowerCase();
    const canWithdraw = isExpired && info.goalReached && isCreator && !info.fundsWithdrawn;
    const imageUrl = storedCampaign?.image_url || storedCampaign?.campaign_image_url || storedCampaign?.cover_image_url || null;
    const badgeClass = info.isCancelled
        ? 'badge-cancelled'
        : info.goalReached
            ? 'badge-success'
            : isExpired
                ? 'badge-danger'
                : 'badge-active';
    const badgeLabel = info.isCancelled
        ? 'Cancelled'
        : info.goalReached
            ? 'Funded'
            : isExpired
                ? 'Ended'
                : 'Active';

    return (
        <div className="fade-in campaign-detail-wrapper">
            <button className="btn-back" onClick={() => navigate('/campaigns')}>
                Back to campaigns
            </button>

            <div className="campaign-detail-grid">
                <div className="campaign-info-section">
                    <div className="campaign-detail-hero-card">
                        <div className="campaign-detail-media">
                            {imageUrl && !imageFailed ? (
                                <img
                                    src={imageUrl}
                                    alt={info.title}
                                    className="media-cover-image"
                                    onError={() => setImageFailed(true)}
                                />
                            ) : (
                                <div className="media-cover-placeholder">
                                    <span>{info.title.slice(0, 1)}</span>
                                    <small>Campaign picture</small>
                                </div>
                            )}
                        </div>

                        <div className="campaign-detail-header">
                            <div className="campaign-detail-title-row">
                                <h2 style={{ fontSize: '2rem', lineHeight: 1.2 }}>{info.title}</h2>
                                <span className={`campaign-card-badge ${badgeClass}`}>
                                    {badgeLabel}
                                </span>
                            </div>

                            <p className="campaign-detail-desc">{info.description}</p>

                            <div className="campaign-detail-meta-grid">
                                <div className="campaign-meta-pill">
                                    <span>Creator</span>
                                    <strong>{info.creator.slice(0, 6)}...{info.creator.slice(-4)} {isCreator ? '(You)' : ''}</strong>
                                </div>
                                <div className="campaign-meta-pill">
                                    <span>Deadline</span>
                                    <strong>{deadlineDate.toLocaleDateString()}</strong>
                                </div>
                                <div className="campaign-meta-pill">
                                    <span>Backers</span>
                                    <strong>{contributors.length}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {contribution > 0n && (
                        <div className="contribution-banner">
                            You contributed <strong>{formatEther(contribution)} ETH</strong>. Points earned from this transaction: <strong>{formatEther(contribution)} CFR</strong>.
                        </div>
                    )}
                </div>

                <div className="campaign-donate-card">
                    <div className="funding-progress-header">
                        <span className="amount-raised"><strong>{formatEther(info.totalFunded)} ETH</strong></span>
                        <span className="amount-target">raised of {formatEther(info.fundingTarget)} ETH goal</span>
                    </div>

                    <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>

                    <div className="campaign-card-stats" style={{ marginBottom: '1.5rem' }}>
                        <span>{contributors.length} contributors</span>
                        <span>{progress}% funded</span>
                    </div>

                    {canDonate && (
                        <form onSubmit={handleDonate} className="donate-form-integrated">
                            <div className="input-with-symbol">
                                <span className="currency-symbol">ETH</span>
                                <input
                                    className="input large-input"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    value={donateAmount}
                                    onChange={(e) => setDonateAmount(e.target.value)}
                                    required
                                    disabled={status.isContributing || status.isConfirming}
                                />
                            </div>

                            <button className="btn-success large-btn" type="submit" disabled={status.isContributing || status.isConfirming}>
                                {status.isContributing || status.isConfirming ? 'Processing...' : 'Donate to this campaign'}
                            </button>
                        </form>
                    )}

                    {canWithdraw && (
                        <button className="btn-success large-btn" type="button" onClick={withdrawFunds} disabled={status.isWithdrawing || status.isConfirming}>
                            {status.isWithdrawing || status.isConfirming ? 'Processing...' : 'Withdraw funds'}
                        </button>
                    )}

                    {!canDonate && !canWithdraw && (
                        <div className="campaign-closed-message">
                            {info.goalReached
                                ? 'This campaign has reached its goal. Waiting for the creator to withdraw.'
                                : info.isCancelled
                                    ? 'This campaign was cancelled by the owner.'
                                    : 'This campaign is closed and not accepting new donations.'}
                        </div>
                    )}

                    {status.error && (
                        <p className="text-danger" style={{ marginTop: '1rem', textAlign: 'center' }}>{status.error.message}</p>
                    )}

                    {status.isConfirmed && (
                        <p style={{ color: 'var(--success)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem', fontWeight: 700 }}>
                            Transaction confirmed successfully.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
