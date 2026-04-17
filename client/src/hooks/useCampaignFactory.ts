import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { supabase } from '../lib/supabase';
import { CAMPAIGN_FACTORY_ADDRESS } from '../lib/contracts';
import { clearCampaignImageVersion, getCampaignImagePath, rememberCampaignImageVersion, removeMediaFile, uploadMediaFile } from '../lib/media';

const FACTORY_ABI = [
    {
        "type": "function",
        "name": "createCampaign",
        "inputs": [
            { "name": "_title", "type": "string" },
            { "name": "_description", "type": "string" },
            { "name": "_fundingTarget", "type": "uint256" },
            { "name": "_durationInDays", "type": "uint256" }
        ],
        "outputs": [{ "type": "address" }],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getCampaigns",
        "inputs": [],
        "outputs": [{ "type": "address[]" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getUserCampaigns",
        "inputs": [{ "name": "_user", "type": "address" }],
        "outputs": [{ "type": "address[]" }],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "CampaignCreated",
        "inputs": [
            { "indexed": true, "name": "campaignAddress", "type": "address" },
            { "indexed": true, "name": "creator", "type": "address" },
            { "indexed": false, "name": "title", "type": "string" },
            { "indexed": false, "name": "fundingTarget", "type": "uint256" },
            { "indexed": false, "name": "durationInDays", "type": "uint256" }
        ]
    }
] as const;

type CampaignRecord = {
    address: `0x${string}`;
    creator: string | null;
    title: string | null;
    description?: string | null;
    target_eth?: string | number | null;
    duration_days?: number | null;
    created_at?: string | null;
    imageUrl?: string | null;
    isLive?: boolean;
};

export function useCampaignFactory() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isCreating, error: createError } = useWriteContract();

    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
    const [userCampaigns, setUserCampaigns] = useState<CampaignRecord[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [pendingCampaign, setPendingCampaign] = useState<any>(null);

    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const mapCampaignRow = (row: any, overrides?: Partial<CampaignRecord>): CampaignRecord => {
        const storedImageUrl = row.image_url ?? row.campaign_image_url ?? row.cover_image_url ?? null;

        if (storedImageUrl) {
            try {
                const parsedUrl = new URL(storedImageUrl);
                const versionParam = parsedUrl.searchParams.get('v');
                if (versionParam) {
                    rememberCampaignImageVersion(row.address, versionParam);
                }
            } catch {
                // Ignore malformed stored URLs and fall back to the stored string.
            }
        }

        return {
            address: row.address as `0x${string}`,
            creator: row.creator_address ?? null,
            title: row.title ?? null,
            description: row.description ?? null,
            target_eth: row.target_eth ?? null,
            duration_days: row.duration_days ?? null,
            created_at: row.created_at ?? null,
            imageUrl: storedImageUrl ?? null,
            isLive: false,
            ...overrides,
        };
    };

    const sortCampaignRecords = (items: CampaignRecord[]) =>
        [...items].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bTime - aTime;
        });

    const fetchCampaigns = async () => {
        setIsLoadingCampaigns(true);
        try {
            const [allCampaignsResult, ownCampaignsResult] = await Promise.all([
                supabase
                    .from('campaigns')
                    .select('*')
                    .order('created_at', { ascending: false }),
                address
                    ? supabase
                        .from('campaigns')
                        .select('*')
                        .ilike('creator_address', address)
                        .order('created_at', { ascending: false })
                    : Promise.resolve({ data: [], error: null }),
            ]);

            if (allCampaignsResult.error) throw allCampaignsResult.error;
            if (ownCampaignsResult.error) throw ownCampaignsResult.error;

            setCampaigns(sortCampaignRecords((allCampaignsResult.data ?? []).map((row: any) => mapCampaignRow(row))));
            setUserCampaigns(sortCampaignRecords((ownCampaignsResult.data ?? []).map((row: any) => mapCampaignRow(row))));
        } catch (err) {
            console.error('Failed to fetch campaigns', err);
            setCampaigns([]);
            setUserCampaigns([]);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    useEffect(() => {
        void fetchCampaigns();
    }, [address]);

    useEffect(() => {
        const syncToSupabase = async () => {
            if (!isConfirmed || !receipt || !pendingCampaign) return;

            try {
                let newCampaignAddress = 'UNKNOWN';

                for (const log of receipt.logs) {
                    try {
                        const decoded = decodeEventLog({
                            abi: FACTORY_ABI,
                            data: log.data,
                            topics: log.topics,
                        });

                        if (decoded.eventName === 'CampaignCreated') {
                            newCampaignAddress = decoded.args.campaignAddress as string;
                        }
                    } catch {
                        // Ignore non-matching logs.
                    }
                }

                const { error: campaignSyncError } = await supabase.from('campaigns').upsert({
                    address: newCampaignAddress,
                    creator_address: address,
                    title: pendingCampaign.title,
                    description: pendingCampaign.description,
                    target_eth: pendingCampaign.targetEth,
                    duration_days: pendingCampaign.durationDays,
                    created_at: new Date().toISOString(),
                    image_url: null,
                }, { onConflict: 'address' });

                if (campaignSyncError) {
                    throw campaignSyncError;
                }

                if (!pendingCampaign.imageFile) {
                    try {
                        await removeMediaFile(getCampaignImagePath(newCampaignAddress));
                    } catch (staleImageResetError) {
                        console.warn('Failed to clear stale campaign image during campaign sync.', staleImageResetError);
                    }

                    clearCampaignImageVersion(newCampaignAddress);
                }

                if (pendingCampaign.imageFile) {
                    const imagePath = getCampaignImagePath(newCampaignAddress);
                    const imageUrl = await uploadMediaFile(pendingCampaign.imageFile, imagePath);
                    const imageVersion = Date.now().toString();
                    const versionedImageUrl = imageUrl.includes('?')
                        ? `${imageUrl}&v=${encodeURIComponent(imageVersion)}`
                        : `${imageUrl}?v=${encodeURIComponent(imageVersion)}`;
                    rememberCampaignImageVersion(newCampaignAddress, imageVersion);

                    try {
                        const { error: imageColumnError } = await supabase
                            .from('campaigns')
                            .update({ image_url: versionedImageUrl })
                            .eq('address', newCampaignAddress);

                        if (imageColumnError) {
                            throw imageColumnError;
                        }
                    } catch (imageSyncError) {
                        console.warn('Campaign image uploaded, but failed to persist image_url column.', imageSyncError);
                    }
                }
            } catch (err) {
                console.error('Failed to sync campaign to Supabase', err);
            } finally {
                setPendingCampaign(null);
                void fetchCampaigns();
            }
        };

        void syncToSupabase();
    }, [address, isConfirmed, pendingCampaign, receipt]);

    const createCampaign = (title: string, description: string, targetEth: string, durationDays: number, imageFile?: File | null) => {
        setPendingCampaign({ title, description, targetEth, durationDays, imageFile: imageFile ?? null });
        writeContract({
            address: CAMPAIGN_FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'createCampaign',
            args: [title, description, parseEther(targetEth), BigInt(durationDays)],
        });
    };

    return {
        campaigns,
        userCampaigns,
        createCampaign,
        refetchCampaigns: fetchCampaigns,
        status: {
            isLoadingCampaigns,
            isCreating,
            isConfirming,
            isConfirmed,
            error: createError,
            txHash: hash,
        },
    };
}
