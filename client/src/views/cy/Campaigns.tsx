import { useEffect, useMemo, useState } from 'react';
import { formatEther } from 'viem';
import { useNavigate } from 'react-router-dom';
import { usePublicClient } from 'wagmi';
import { useCampaignFactory } from '../../hooks/useCampaignFactory';

const CAMPAIGN_STATUS_ABI = [
    {
        type: 'function',
        name: 'getCampaignInfo',
        inputs: [],
        outputs: [
            {
                type: 'tuple',
                components: [
                    { name: 'creator', type: 'address' },
                    { name: 'title', type: 'string' },
                    { name: 'description', type: 'string' },
                    { name: 'fundingTarget', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                    { name: 'totalFunded', type: 'uint256' },
                    { name: 'goalReached', type: 'bool' },
                    { name: 'fundsWithdrawn', type: 'bool' },
                    { name: 'isCancelled', type: 'bool' },
                ],
            },
        ],
        stateMutability: 'view',
    },
] as const;

type LiveCampaignInfo = {
    creator: `0x${string}`;
    title: string;
    description: string;
    fundingTarget: bigint;
    deadline: bigint;
    totalFunded: bigint;
    goalReached: boolean;
    fundsWithdrawn: boolean;
    isCancelled: boolean;
};

function CampaignCard({ campaign }: { campaign: { address: `0x${string}`; imageUrl?: string | null; title?: string | null; description?: string | null; target_eth?: string | number | null; duration_days?: number | null; created_at?: string | null } }) {
    const navigate = useNavigate();
    const publicClient = usePublicClient();
    const [imageFailed, setImageFailed] = useState(false);
    const [liveInfo, setLiveInfo] = useState<LiveCampaignInfo | null>(null);

    useEffect(() => {
        let ignore = false;

        if (!publicClient) {
            setLiveInfo(null);
            return;
        }

        void publicClient.readContract({
            address: campaign.address,
            abi: CAMPAIGN_STATUS_ABI,
            functionName: 'getCampaignInfo',
        })
            .then((result) => {
                if (!ignore) {
                    setLiveInfo(result as LiveCampaignInfo);
                }
            })
            .catch(() => {
                if (!ignore) {
                    setLiveInfo(null);
                }
            });

        return () => {
            ignore = true;
        };
    }, [campaign.address, publicClient]);

    if (!campaign.title) return null;

    const createdAtLabel = campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : 'Stored record';
    const durationLabel = campaign.duration_days ? `${campaign.duration_days} day${campaign.duration_days === 1 ? '' : 's'}` : 'No duration';
    const targetEth = useMemo(() => {
        if (liveInfo) {
            return Number(formatEther(liveInfo.fundingTarget));
        }

        return Number(campaign.target_eth || 0);
    }, [campaign.target_eth, liveInfo]);
    const fundedEth = liveInfo ? Number(formatEther(liveInfo.totalFunded)) : 0;
    const storedDeadline = campaign.created_at && campaign.duration_days
        ? new Date(new Date(campaign.created_at).getTime() + campaign.duration_days * 24 * 60 * 60 * 1000)
        : null;
    const deadlineDate = liveInfo
        ? new Date(Number(liveInfo.deadline) * 1000)
        : storedDeadline;
    const isExpired = deadlineDate ? deadlineDate.getTime() < Date.now() : false;
    const progressPercent = liveInfo && liveInfo.fundingTarget > 0n
        ? Math.min(100, (Number(liveInfo.totalFunded) / Number(liveInfo.fundingTarget)) * 100)
        : 0;
    const daysLeftLabel = deadlineDate
        ? isExpired
            ? 'Funding ended'
            : `${Math.max(1, Math.ceil((deadlineDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} days left`
        : durationLabel;

    const status = liveInfo
        ? (liveInfo.goalReached ? 'success' : (liveInfo.isCancelled || isExpired ? 'failed' : 'funding'))
        : (storedDeadline ? (isExpired ? 'failed' : 'funding') : 'stored');

    const progressDisplay = status === 'success' ? 100 : Math.max(status === 'funding' ? 8 : 0, progressPercent);

    const statusConfig = {
        success: {
            badgeClass: 'badge-success',
            badgeLabel: 'Funded',
            overlayTitle: 'Successfully funded',
            overlaySummary: 'Target reached. This campaign is ready to move into treatment delivery.',
            panelEyebrow: 'Status summary',
            panelValue: liveInfo?.fundsWithdrawn ? 'Funds already moved' : 'Goal reached and ready',
            panelText: liveInfo?.fundsWithdrawn
                ? 'The campaign has completed funding and the raised amount has already been withdrawn.'
                : 'The campaign has completed funding and is waiting for the next treatment step.',
            metrics: [
                { label: 'Raised', value: `${fundedEth.toFixed(4)} ETH` },
                { label: 'Target', value: `${targetEth.toFixed(4)} ETH` },
                { label: 'Progress', value: '100%' },
                { label: 'Stage', value: liveInfo?.fundsWithdrawn ? 'Completed' : 'Ready' },
            ],
        },
        failed: {
            badgeClass: 'badge-danger',
            badgeLabel: 'Not funded',
            overlayTitle: 'Funding target missed',
            overlaySummary: 'The deadline passed before the campaign could reach its target amount.',
            panelEyebrow: 'Status summary',
            panelValue: liveInfo ? `${fundedEth.toFixed(4)} ETH raised before closing` : 'Campaign closed without success',
            panelText: 'This campaign has ended and is no longer collecting support.',
            metrics: [
                { label: 'Raised', value: `${fundedEth.toFixed(4)} ETH` },
                { label: 'Target', value: `${targetEth.toFixed(4)} ETH` },
                { label: 'Final progress', value: `${progressPercent.toFixed(0)}%` },
                { label: 'State', value: 'Closed' },
            ],
        },
        funding: {
            badgeClass: 'badge-active',
            badgeLabel: 'Funding',
            overlayTitle: 'Funding in progress',
            overlaySummary: 'The campaign is still open for support and continues to collect donations.',
            panelEyebrow: 'Status summary',
            panelValue: liveInfo ? `${progressPercent.toFixed(0)}% of the target already reached` : 'Stored as active campaign',
            panelText: liveInfo ? `${fundedEth.toFixed(4)} ETH has already been contributed.` : 'Open the campaign page to see the full live contract state.',
            metrics: [
                { label: 'Raised', value: `${fundedEth.toFixed(4)} ETH` },
                { label: 'Target', value: `${targetEth.toFixed(4)} ETH` },
                { label: 'Time left', value: daysLeftLabel },
                { label: 'Progress', value: `${progressPercent.toFixed(0)}%` },
            ],
        },
        stored: {
            badgeClass: 'badge-active',
            badgeLabel: 'Stored',
            overlayTitle: 'Stored campaign record',
            overlaySummary: 'This campaign is available from Supabase and is waiting for readable chain status.',
            panelEyebrow: 'Status summary',
            panelValue: `${targetEth.toFixed(4)} ETH target saved`,
            panelText: 'Primary details are available, but live funding status is not readable on the current chain.',
            metrics: [
                { label: 'Target', value: `${targetEth.toFixed(4)} ETH` },
                { label: 'Planned length', value: durationLabel },
                { label: 'Saved on', value: createdAtLabel },
                { label: 'State', value: 'Archived' },
            ],
        },
    }[status];

    return (
        <button
            className={`campaign-showcase-card campaign-showcase-card-${status}`}
            onClick={() => navigate(`/campaigns/${campaign.address}`)}
        >
            <div className="campaign-showcase-media">
                {campaign.imageUrl && !imageFailed ? (
                    <img
                        src={campaign.imageUrl}
                        alt={campaign.title}
                        className="media-cover-image"
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <div className="media-cover-placeholder">
                        <span>{campaign.title.slice(0, 1)}</span>
                        <small>Campaign visual</small>
                    </div>
                )}

                <span className={`campaign-card-badge ${statusConfig.badgeClass}`}>
                    {statusConfig.badgeLabel}
                </span>
            </div>

            <div className="campaign-showcase-content">
                <div className="campaign-showcase-main">
                    <div className="campaign-showcase-header">
                        <h3 className="campaign-card-title">{campaign.title}</h3>
                        <span className="campaign-showcase-progress">{targetEth.toFixed(2)} ETH</span>
                    </div>
                </div>

                <div className={`campaign-showcase-status-panel campaign-showcase-status-panel-${status}`}>
                    <span className="campaign-showcase-panel-label">{statusConfig.panelEyebrow}</span>
                    <strong>{statusConfig.panelValue}</strong>
                    <p>{statusConfig.panelText}</p>
                </div>

                <div className="campaign-showcase-bottom">
                    <div className={`progress-bar campaign-progress-${status}`}>
                        <div
                            className="progress-fill"
                            style={{ width: `${progressDisplay}%` }}
                        />
                    </div>

                    <div className={`campaign-showcase-metrics campaign-showcase-metrics-${status}`}>
                        {statusConfig.metrics.map((metric) => (
                            <div key={metric.label} className="campaign-showcase-metric">
                                <span>{metric.label}</span>
                                <strong>{metric.value}</strong>
                            </div>
                        ))}
                    </div>

                    <div className="campaign-showcase-supporting">
                        <p className="campaign-card-desc campaign-showcase-description">
                            {campaign.description || 'Campaign details were saved successfully and are loaded from Supabase.'}
                        </p>
                    </div>

                    <div className="campaign-showcase-footer">
                        <span>{createdAtLabel}</span>
                        <span>{campaign.address.slice(0, 6)}...{campaign.address.slice(-4)}</span>
                    </div>
                </div>
            </div>
        </button>
    );
}

export function CampaignsView() {
    const { campaigns, status } = useCampaignFactory();
    const navigate = useNavigate();

    return (
        <div className="fade-in">
            <button className="btn-back" onClick={() => navigate('/profile')}>
                Back to profile
            </button>

            <div className="campaigns-header">
                <div>
                    <div className="auth-kicker">Campaign board</div>
                    <h2>Browse campaign cards</h2>
                    <p>Each campaign is presented as a cleaner visual card with room for imagery, progress, and quick scanning.</p>
                </div>

                <button className="btn-primary campaigns-header-cta" onClick={() => navigate('/campaigns/create')}>
                    Create a new campaign
                </button>
            </div>

            {status.isLoadingCampaigns ? (
                <div className="text-center" style={{ padding: '2rem 0' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>Loading campaigns...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="empty-state-card">
                    No campaigns yet. Create the first one.
                </div>
            ) : (
                <div className="campaigns-grid">
                    {campaigns.map((campaign) => (
                        <CampaignCard key={campaign.address} campaign={campaign} />
                    ))}
                </div>
            )}
        </div>
    );
}
