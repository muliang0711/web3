import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatEther } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';
import { useCampaign } from '../../hooks/useCampaign';
import { enrichDonationRowsWithChainTimestamps, enrichRefundRowsWithChainTimestamps, fetchCampaignCreatedAtMap, fetchRefundRowsFromChainForCampaign } from '../../lib/chainActivity';
import { supabase } from '../../lib/supabase';

function formatAddress(value?: string | null) {
    if (!value) return '-';
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

type DonationRow = {
    id?: string | number;
    donor_address?: string;
    campaign_address?: string;
    amount_eth?: string | number;
    created_at?: string;
};

type RefundRow = {
    id?: string | number;
    user_address?: string;
    campaign_address?: string;
    amount_eth?: string | number;
    tx_hash?: string;
    created_at?: string;
};

export function CampaignReportView() {
    const navigate = useNavigate();
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { address: campaignAddress } = useParams<{ address: string }>();
    const [imageFailed, setImageFailed] = useState(false);
    const [donations, setDonations] = useState<DonationRow[]>([]);
    const [refunds, setRefunds] = useState<RefundRow[]>([]);
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [isLoadingReport, setIsLoadingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [pendingRefundSuccessCount, setPendingRefundSuccessCount] = useState<string | null>(null);
    const [storedImageUrl, setStoredImageUrl] = useState<string | null>(null);
    const syncedReportTxHashRef = useRef<string | null>(null);

    const {
        info,
        contributors,
        outstandingRefundCount,
        refundAll,
        withdrawFunds,
        refetchInfo,
        status,
    } = useCampaign(campaignAddress as `0x${string}` | undefined);

    const imageUrl = storedImageUrl;
    const isOwner = Boolean(address && info && address.toLowerCase() === info.creator.toLowerCase());

    useEffect(() => {
        let ignore = false;

        if (!campaignAddress) {
            setStoredImageUrl(null);
            return;
        }

        const fetchStoredImageUrl = async () => {
            try {
                const { data, error } = await supabase
                    .from('campaigns')
                    .select('image_url, campaign_image_url, cover_image_url')
                    .eq('address', campaignAddress)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!ignore) {
                    setStoredImageUrl(data?.image_url ?? data?.campaign_image_url ?? data?.cover_image_url ?? null);
                }
            } catch (error) {
                console.warn('Failed to load stored campaign image for owner report.', error);
                if (!ignore) {
                    setStoredImageUrl(null);
                }
            }
        };

        void fetchStoredImageUrl();

        return () => {
            ignore = true;
        };
    }, [campaignAddress]);

    const fetchReport = useCallback(async () => {
        if (!campaignAddress) {
            setDonations([]);
            setRefunds([]);
            setUserNames({});
            return;
        }

        setIsLoadingReport(true);
        setReportError(null);

        try {
            const [{ data: donationData, error: donationError }, { data: refundData, error: refundError }] = await Promise.all([
                supabase
                    .from('donations')
                    .select('*')
                    .ilike('campaign_address', campaignAddress)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('refunds')
                    .select('*')
                    .ilike('campaign_address', campaignAddress)
                    .order('created_at', { ascending: false }),
            ]);

            if (donationError) throw donationError;
            if (refundError) throw refundError;

            let safeDonations = donationData ?? [];
            let safeRefunds = refundData ?? [];

            if (publicClient) {
                try {
                    [safeDonations, safeRefunds] = await Promise.all([
                        enrichDonationRowsWithChainTimestamps(publicClient, safeDonations),
                        enrichRefundRowsWithChainTimestamps(publicClient, safeRefunds),
                    ]);
                } catch (timestampError) {
                    console.warn('Failed to load on-chain timestamps for owner campaign report.', timestampError);
                }

                try {
                    const createdAtMap = await fetchCampaignCreatedAtMap(publicClient, [campaignAddress]);
                    const campaignCreatedAt = createdAtMap.get(campaignAddress.toLowerCase());

                    if (campaignCreatedAt) {
                        const campaignCreatedAtMs = new Date(campaignCreatedAt).getTime();
                        const isCurrentSessionRow = (row: { created_at?: string | null }) => {
                            const rowTime = row.created_at ? new Date(row.created_at).getTime() : 0;
                            return rowTime >= campaignCreatedAtMs;
                        };

                        safeDonations = safeDonations.filter(isCurrentSessionRow);
                        safeRefunds = safeRefunds.filter(isCurrentSessionRow);
                    }
                } catch (campaignCreatedAtError) {
                    console.warn('Failed to scope owner report to current campaign lifecycle.', campaignCreatedAtError);
                }

                try {
                    const onChainRefundRows = await fetchRefundRowsFromChainForCampaign(publicClient, campaignAddress as `0x${string}`);
                    if (onChainRefundRows.length > 0) {
                        safeRefunds = onChainRefundRows;
                    }
                } catch (chainRefundError) {
                    console.warn('Failed to load current refund events directly from chain.', chainRefundError);
                }
            }

            setDonations(safeDonations);
            setRefunds(safeRefunds);

            const walletAddresses = Array.from(new Set([
                ...safeDonations.map((row: any) => row.donor_address).filter(Boolean),
                ...safeRefunds.map((row: any) => row.user_address).filter(Boolean),
            ]));

            if (walletAddresses.length === 0) {
                setUserNames({});
                return;
            }

            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('wallet_address, name')
                .in('wallet_address', walletAddresses);

            if (usersError) throw usersError;

            setUserNames(
                Object.fromEntries(
                    (users ?? []).map((user: any) => [String(user.wallet_address).toLowerCase(), user.name])
                )
            );
        } catch (error: any) {
            console.error('Failed to load owner campaign report', error);
            setReportError(error?.message || 'Failed to load campaign report.');
            setDonations([]);
            setRefunds([]);
            setUserNames({});
        } finally {
            setIsLoadingReport(false);
        }
    }, [campaignAddress, publicClient]);

    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    useEffect(() => {
        if (!status.txHash) {
            syncedReportTxHashRef.current = null;
        }
    }, [status.txHash]);

    useEffect(() => {
        if (!status.isConfirmed || !status.txHash) {
            return;
        }
        if (syncedReportTxHashRef.current === status.txHash) {
            return;
        }

        syncedReportTxHashRef.current = status.txHash;

        if (pendingRefundSuccessCount && campaignAddress) {
            navigate(
                `/campaigns/${campaignAddress}/refund-success?count=${encodeURIComponent(pendingRefundSuccessCount)}&tx=${status.txHash}`,
                { replace: true }
            );
            return;
        }

        void refetchInfo();
        void fetchReport();
    }, [campaignAddress, fetchReport, navigate, pendingRefundSuccessCount, refetchInfo, status.isConfirmed, status.txHash]);

    const donationVolume = useMemo(
        () => donations.reduce((sum, row) => sum + Number(row.amount_eth || 0), 0),
        [donations]
    );
    const refundedVolume = useMemo(
        () => refunds.reduce((sum, row) => sum + Number(row.amount_eth || 0), 0),
        [refunds]
    );
    const averageDonation = donations.length > 0 ? donationVolume / donations.length : 0;
    const deadlineDate = info ? new Date(Number(info.deadline) * 1000) : null;
    const isExpired = deadlineDate ? deadlineDate < new Date() : false;
    const canRefundAll = Boolean(isOwner && info && !info.goalReached && !info.fundsWithdrawn && outstandingRefundCount > 0n);
    const canWithdraw = Boolean(isOwner && info && info.goalReached && !info.fundsWithdrawn);
    const showWithdrawAction = Boolean(isOwner && info && (info.goalReached || info.fundsWithdrawn));
    const isWithdrawDisabled = Boolean(status.isWithdrawing || status.isConfirming || !canWithdraw);
    const withdrawButtonLabel = status.isWithdrawing || status.isConfirming
        ? 'Processing...'
        : info?.fundsWithdrawn
            ? 'Funds withdrawn'
            : canWithdraw
                ? 'Withdraw funds'
                : 'Withdraw unavailable';
    const withdrawButtonTitle = info?.fundsWithdrawn
        ? 'This campaign has already been withdrawn.'
        : canWithdraw
            ? 'Withdraw the raised ETH to the creator wallet.'
            : 'Withdrawal is not available for this campaign yet.';
    const progress = info && info.fundingTarget > 0n ? Number((info.totalFunded * 100n) / info.fundingTarget) : 0;

    const handleRefundAll = () => {
        setPendingRefundSuccessCount(outstandingRefundCount.toString());
        refundAll();
    };

    if (status.isLoadingInfo) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <div className="spinner" />
                <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Loading owner report...</p>
            </div>
        );
    }

    if (!info || !campaignAddress) {
        return (
            <div className="fade-in text-center" style={{ padding: '3rem 0' }}>
                <p>Campaign report not available.</p>
                <button className="btn-ghost" onClick={() => navigate('/user/created-history')} style={{ marginTop: '1rem' }}>
                    Back to my campaign
                </button>
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="fade-in owner-report-page">
                <button className="btn-back" onClick={() => navigate('/user/created-history')}>
                    Back
                </button>
                <div className="empty-state-card owner-report-empty">
                    This report is only available to the campaign creator.
                </div>
            </div>
        );
    }

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
            ? 'Goal reached'
            : isExpired
                ? 'Ended'
                : 'Active';

    return (
        <div className="fade-in owner-report-page">
            <button className="btn-back" onClick={() => navigate('/user/created-history')}>
                Back
            </button>

            <section className="owner-report-hero card">
                <div className="owner-report-hero-media">
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
                            <small>Campaign</small>
                        </div>
                    )}
                </div>

                <div className="owner-report-hero-copy">
                    <div className="auth-kicker">Owner report</div>
                    <div className="owner-report-title-row">
                        <h2>{info.title}</h2>
                        <span className={`campaign-card-badge ${badgeClass}`}>
                            {badgeLabel}
                        </span>
                    </div>
                    <p>{info.description}</p>
                    <div className="owner-report-meta">
                        <span>{campaignAddress}</span>
                        <span>Deadline: {deadlineDate?.toLocaleString() || '-'}</span>
                    </div>
                    <div className="owner-report-progress">
                        <div className="funding-progress-header">
                            <span className="amount-raised"><strong>{formatEther(info.totalFunded)} ETH</strong></span>
                            <span className="amount-target">raised of {formatEther(info.fundingTarget)} ETH goal</span>
                        </div>
                        <div className="progress-bar" style={{ marginTop: '0.9rem' }}>
                            <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="owner-report-stat-grid">
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Donation txs</span>
                    <span className="quick-stat-value">{donations.length}</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Contributors</span>
                    <span className="quick-stat-value">{contributors.length}</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Donation volume</span>
                    <span className="quick-stat-value">{donationVolume.toFixed(4)} ETH</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Average donation</span>
                    <span className="quick-stat-value">{averageDonation.toFixed(4)} ETH</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Refund txs</span>
                    <span className="quick-stat-value">{refunds.length}</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Refunded volume</span>
                    <span className="quick-stat-value" style={{ color: 'var(--danger)' }}>{refundedVolume.toFixed(4)} ETH</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Refunds pending</span>
                    <span className="quick-stat-value">{outstandingRefundCount.toString()}</span>
                </div>
                <div className="quick-stat-card">
                    <span className="quick-stat-label">Funds withdrawn</span>
                    <span className="quick-stat-value">{info.fundsWithdrawn ? 'Yes' : 'No'}</span>
                </div>
            </section>

            <section className="owner-report-action-panel card">
                <div>
                    <div className="auth-kicker">Actions</div>
                    <h3>Manage campaign outcome</h3>
                    <p>Use this view to review incoming donation records, inspect refunds, and run owner-only settlement actions with chain-derived time where available.</p>
                </div>
                <div className="owner-report-actions">
                    <button type="button" className="btn-ghost" onClick={() => navigate(`/campaigns/${campaignAddress}`)}>
                        Open public page
                    </button>
                    {showWithdrawAction && (
                        <button
                            type="button"
                            className="btn-success"
                            onClick={withdrawFunds}
                            disabled={isWithdrawDisabled}
                            title={withdrawButtonTitle}
                        >
                            {withdrawButtonLabel}
                        </button>
                    )}
                    {canRefundAll && (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleRefundAll}
                            disabled={status.isRefunding || status.isConfirming}
                        >
                            {status.isRefunding || status.isConfirming ? 'Refunding...' : isExpired ? 'Refund all contributors' : 'Refund all now'}
                        </button>
                    )}
                </div>
            </section>

            {status.error && (
                <p className="text-danger">{status.error.message}</p>
            )}
            {reportError && (
                <p className="text-danger">{reportError}</p>
            )}

            <div className="owner-report-section-grid">
                <section className="owner-report-panel card">
                    <div className="profile-section-heading">
                        <div>
                            <div className="auth-kicker">Donation history</div>
                            <h3>Incoming transactions</h3>
                            <p>Times shown here prefer the on-chain donation event timestamp.</p>
                        </div>
                    </div>

                    {isLoadingReport ? (
                        <div className="text-center" style={{ padding: '2rem 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : donations.length === 0 ? (
                        <div className="empty-state-card">No donation transactions recorded for this campaign yet.</div>
                    ) : (
                        <div className="owner-report-list">
                            {donations.map((row, index) => {
                                const donorAddress = row.donor_address || '';
                                const donorName = userNames[donorAddress.toLowerCase()] || formatAddress(donorAddress);
                                const amount = Number(row.amount_eth || 0);

                                return (
                                    <div className="owner-report-row" key={row.id || index}>
                                        <div className="history-item-icon">+</div>
                                        <div className="history-item-content">
                                            <p className="history-item-text">
                                                <strong>{donorName}</strong> donated <strong>{amount.toFixed(4)} ETH</strong>
                                            </p>
                                            <p className="history-item-meta">
                                                {row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown chain time'}
                                            </p>
                                        </div>
                                        <div className="history-points">
                                            <strong>+{amount.toFixed(4)} CFR</strong>
                                            <small>points in tx</small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="owner-report-panel card">
                    <div className="profile-section-heading">
                        <div>
                            <div className="auth-kicker">Refund history</div>
                            <h3>Processed refunds</h3>
                            <p>Refund times prefer the block time of the `RefundIssued` event.</p>
                        </div>
                    </div>

                    {isLoadingReport ? (
                        <div className="text-center" style={{ padding: '2rem 0' }}>
                            <div className="spinner" />
                        </div>
                    ) : refunds.length === 0 ? (
                        <div className="empty-state-card">No refund records recorded for this campaign yet.</div>
                    ) : (
                        <div className="owner-report-list">
                            {refunds.map((row, index) => {
                                const walletAddress = row.user_address || '';
                                const userName = userNames[walletAddress.toLowerCase()] || formatAddress(walletAddress);
                                const amount = Number(row.amount_eth || 0);

                                return (
                                    <div className="owner-report-row" key={row.id || index}>
                                        <div className="history-item-icon">-</div>
                                        <div className="history-item-content">
                                            <p className="history-item-text">
                                                <strong>{userName}</strong> refunded <strong>{amount.toFixed(4)} ETH</strong>
                                            </p>
                                            <p className="history-item-meta">
                                                {row.created_at ? new Date(row.created_at).toLocaleString() : 'Unknown chain time'}
                                            </p>
                                        </div>
                                        <div className="history-points negative">
                                            <strong>-{amount.toFixed(4)} CFR</strong>
                                            <small>points in tx</small>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
