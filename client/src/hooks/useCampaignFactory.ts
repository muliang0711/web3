import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { supabase } from '../lib/supabase';
import { CAMPAIGN_FACTORY_ADDRESS } from '../lib/contracts';
import { fetchCampaignCreatedAtMap } from '../lib/chainActivity';
import { getCampaignImagePath, getCampaignImageUrl, uploadMediaFile } from '../lib/media';

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
};

export function useCampaignFactory() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { writeContract, data: hash, isPending: isCreating, error: createError } = useWriteContract();

    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
    const [userCampaigns, setUserCampaigns] = useState<CampaignRecord[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [pendingCampaign, setPendingCampaign] = useState<any>(null);

    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const fetchCampaigns = async () => {
        if (!publicClient) {
            setCampaigns([]);
            setUserCampaigns([]);
            return;
        }

        setIsLoadingCampaigns(true);
        try {
            const [chainCampaigns, chainUserCampaigns] = await Promise.all([
                publicClient.readContract({
                    address: CAMPAIGN_FACTORY_ADDRESS,
                    abi: FACTORY_ABI,
                    functionName: 'getCampaigns',
                }) as Promise<readonly `0x${string}`[]>,
                address
                    ? publicClient.readContract({
                        address: CAMPAIGN_FACTORY_ADDRESS,
                        abi: FACTORY_ABI,
                        functionName: 'getUserCampaigns',
                        args: [address],
                    }) as Promise<readonly `0x${string}`[]>
                    : Promise.resolve([] as const),
            ]);

            if (chainCampaigns.length === 0) {
                setCampaigns([]);
                setUserCampaigns([]);
                return;
            }

            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .in('address', [...chainCampaigns]);

            if (error) throw error;

            let createdAtMap = new Map<string, string | null>();
            try {
                createdAtMap = await fetchCampaignCreatedAtMap(publicClient, [...chainCampaigns]);
            } catch (timestampError) {
                console.warn('Failed to load on-chain campaign creation timestamps, falling back to database created_at.', timestampError);
            }

            const rowByAddress = new Map(
                (data ?? []).map((row: any) => [
                    String(row.address).toLowerCase(),
                    {
                        address: row.address as `0x${string}`,
                        creator: row.creator_address,
                        title: row.title,
                        description: row.description,
                        target_eth: row.target_eth,
                        duration_days: row.duration_days,
                        created_at: createdAtMap.get(String(row.address).toLowerCase()) ?? row.created_at,
                        imageUrl: row.image_url ?? row.campaign_image_url ?? row.cover_image_url ?? getCampaignImageUrl(row.address),
                    } satisfies CampaignRecord,
                ])
            );

            const toRecord = (campaignAddress: `0x${string}`): CampaignRecord => (
                rowByAddress.get(campaignAddress.toLowerCase()) ?? {
                    address: campaignAddress,
                    creator: null,
                    title: null,
                    imageUrl: getCampaignImageUrl(campaignAddress),
                }
            );

            setCampaigns([...chainCampaigns].map(toRecord));
            setUserCampaigns([...chainUserCampaigns].map(toRecord));
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
    }, [address, publicClient]);

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
                }, { onConflict: 'address' });

                if (campaignSyncError) {
                    throw campaignSyncError;
                }

                if (pendingCampaign.imageFile) {
                    const imagePath = getCampaignImagePath(newCampaignAddress);
                    const imageUrl = await uploadMediaFile(pendingCampaign.imageFile, imagePath);

                    try {
                        const { error: imageColumnError } = await supabase
                            .from('campaigns')
                            .update({ image_url: imageUrl })
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
    }, [address, isConfirmed, pendingCampaign, receipt, publicClient]);

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
