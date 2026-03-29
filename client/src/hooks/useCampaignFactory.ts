import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther, decodeEventLog, parseAbiItem } from 'viem';
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

export function useCampaignFactory() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { writeContract, data: hash, isPending: isCreating, error: createError } = useWriteContract();

    // On-chain campaign addresses (source of truth)
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

    // Pending Form Data Temporary Storage
    const [pendingCampaign, setPendingCampaign] = useState<any>(null);

    // Watch for tx confirmation
    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // Fetch campaign addresses from on-chain events (source of truth — not affected by testnet restarts)
    const fetchCampaigns = async () => {
        if (!publicClient) return;
        setIsLoadingCampaigns(true);
        try {
            const logs = await publicClient.getLogs({
                address: CAMPAIGN_FACTORY_ADDRESS,
                event: parseAbiItem('event CampaignCreated(address indexed campaignAddress, address indexed creator, string title, uint256 fundingTarget, uint256 durationInDays)'),
                fromBlock: 0n,
                toBlock: 'latest',
            });

            // All campaigns (newest first)
            const all = [...logs].reverse().map(log => ({
                address: log.args.campaignAddress as `0x${string}`,
                creator: log.args.creator,
                title: log.args.title,
            }));
            setCampaigns(all);

            // User's own campaigns
            if (address) {
                const mine = all.filter(c => c.creator?.toLowerCase() === address.toLowerCase());
                setUserCampaigns(mine);
            } else {
                setUserCampaigns([]);
            }
        } catch (err) {
            console.error("Failed to fetch campaigns from chain", err);
        } finally {
            setIsLoadingCampaigns(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, [address, publicClient]);

    // Handle Transaction Success — also sync to Supabase for donation history queries
    useEffect(() => {
        const syncToSupabase = async () => {
            if (isConfirmed && receipt && pendingCampaign) {
                try {
                    let newCampaignAddress = "UNKNOWN";
                    for (const log of receipt.logs) {
                        try {
                            const decoded = decodeEventLog({
                                abi: FACTORY_ABI,
                                data: log.data,
                                topics: log.topics,
                            });
                            if (decoded.eventName === 'CampaignCreated') {
                                newCampaignAddress = (decoded.args as any).campaignAddress;
                            }
                        } catch (e) { /* ignore non-matching logs */ }
                    }

                    // Also write to Supabase for cross-referencing donations with campaign names
                    await supabase.from('campaigns').upsert({
                        address: newCampaignAddress,
                        creator_address: address,
                        title: pendingCampaign.title,
                        description: pendingCampaign.description,
                        target_eth: pendingCampaign.targetEth,
                        duration_days: pendingCampaign.durationDays,
                    }, { onConflict: 'address' });

                    setPendingCampaign(null);
                    fetchCampaigns(); // Refresh the list from chain
                } catch (err) {
                    console.error("Failed to sync campaign to Supabase", err);
                    // Still refresh from chain even if Supabase fails
                    fetchCampaigns();
                    setPendingCampaign(null);
                }
            }
        };
        syncToSupabase();
    }, [isConfirmed, receipt]);

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
