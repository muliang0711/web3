import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
import { supabase } from '../lib/supabase';

const FACTORY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

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
    const { writeContract, data: hash, isPending: isCreating, error: createError } = useWriteContract();

    // Supabase State
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
    const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);

    // Pending Form Data Temporary Storage
    const [pendingCampaign, setPendingCampaign] = useState<any>(null);

    // Watch for tx confirmation
    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // Fetch from Supabase
    const fetchCampaigns = async () => {
        setIsLoadingCampaigns(true);
        const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
        if (data) setCampaigns(data);

        if (address) {
            const { data: userData } = await supabase.from('campaigns').select('*').eq('creator_address', address).order('created_at', { ascending: false });
            if (userData) setUserCampaigns(userData);
        }
        setIsLoadingCampaigns(false);
    };

    useEffect(() => {
        fetchCampaigns();
    }, [address]);

    // Handle Transaction Success to Insert into Supabase
    useEffect(() => {
        const syncToSupabase = async () => {
            if (isConfirmed && receipt && pendingCampaign) {
                try {
                    // Try to extract the new campaign address from the event logs
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
                        } catch (e) {
                            // ignore non-matching logs
                        }
                    }

                    // Insert to Supabase Database
                    await supabase.from('campaigns').insert({
                        address: newCampaignAddress,
                        creator_address: address,
                        title: pendingCampaign.title,
                        description: pendingCampaign.description,
                        target_eth: pendingCampaign.targetEth,
                        duration_days: pendingCampaign.durationDays,
                    });

                    setPendingCampaign(null);
                    fetchCampaigns(); // Refresh the list
                } catch (err) {
                    console.error("Failed to sync campaign to Supabase", err);
                }
            }
        };
        syncToSupabase();
    }, [isConfirmed, receipt]);

    const createCampaign = (title: string, description: string, targetEth: string, durationDays: number) => {
        // Save form data temporarily so we can push to Supabase after the blockchain confirms it
        setPendingCampaign({ title, description, targetEth, durationDays });

        writeContract({
            address: FACTORY_ADDRESS,
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
