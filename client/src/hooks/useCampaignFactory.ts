import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { supabase } from '../lib/supabase';
import { CAMPAIGN_FACTORY_ADDRESS } from '../lib/contracts';

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
};

export function useCampaignFactory() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isCreating, error: createError } = useWriteContract();

    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
    const [userCampaigns, setUserCampaigns] = useState<CampaignRecord[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
    const [pendingCampaign, setPendingCampaign] = useState<any>(null);

    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const fetchCampaigns = async () => {
        setIsLoadingCampaigns(true);
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const all = (data ?? []).map((row: any) => ({
                address: row.address as `0x${string}`,
                creator: row.creator_address,
                title: row.title,
                description: row.description,
                target_eth: row.target_eth,
                duration_days: row.duration_days,
                created_at: row.created_at,
            }));

            setCampaigns(all);

            if (address) {
                const mine = all.filter(c => c.creator?.toLowerCase() === address.toLowerCase());
                setUserCampaigns(mine);
            } else {
                setUserCampaigns([]);
            }
        } catch (err) {
            console.error('Failed to fetch campaigns from Supabase', err);
            setCampaigns([]);
            setUserCampaigns([]);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
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

                await supabase.from('campaigns').upsert({
                    address: newCampaignAddress,
                    creator_address: address,
                    title: pendingCampaign.title,
                    description: pendingCampaign.description,
                    target_eth: pendingCampaign.targetEth,
                    duration_days: pendingCampaign.durationDays,
                }, { onConflict: 'address' });
            } catch (err) {
                console.error('Failed to sync campaign to Supabase', err);
            } finally {
                setPendingCampaign(null);
                fetchCampaigns();
            }
        };

        syncToSupabase();
    }, [address, isConfirmed, pendingCampaign, receipt]);

    const createCampaign = (title: string, description: string, targetEth: string, durationDays: number) => {
        setPendingCampaign({ title, description, targetEth, durationDays });
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
