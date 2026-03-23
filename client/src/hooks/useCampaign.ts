import { useEffect, useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '../lib/supabase';

const CAMPAIGN_ABI = [
    {
        "type": "function",
        "name": "getCampaignInfo",
        "inputs": [],
        "outputs": [
            {
                "type": "tuple",
                "components": [
                    { "name": "creator", "type": "address" },
                    { "name": "title", "type": "string" },
                    { "name": "description", "type": "string" },
                    { "name": "fundingTarget", "type": "uint256" },
                    { "name": "deadline", "type": "uint256" },
                    { "name": "totalFunded", "type": "uint256" },
                    { "name": "goalReached", "type": "bool" },
                    { "name": "fundsWithdrawn", "type": "bool" },
                    { "name": "isCancelled", "type": "bool" }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getContribution",
        "inputs": [{ "name": "_contributor", "type": "address" }],
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "contribute",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "totalFunded",
        "inputs": [],
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view"
    }
] as const;

export type CampaignInfo = {
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

export function useCampaign(campaignAddress?: `0x${string}`) {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isContributing, error: contributeError } = useWriteContract();

    const enabled = !!campaignAddress;
    const [pendingAmount, setPendingAmount] = useState<string>("");

    // Supabase State for Contributors
    const [contributors, setContributors] = useState<string[]>([]);

    // Read campaign info
    const { data: rawInfo, refetch: refetchInfo, isLoading: isLoadingInfo } = useReadContract({
        address: campaignAddress,
        abi: CAMPAIGN_ABI,
        functionName: 'getCampaignInfo',
        query: { enabled },
    });

    // Read user's contribution
    const { data: contribution, refetch: refetchContribution } = useReadContract({
        address: campaignAddress,
        abi: CAMPAIGN_ABI,
        functionName: 'getContribution',
        args: address ? [address] : undefined,
        query: { enabled: enabled && !!address },
    });

    // Fetch contributors from Supabase
    const fetchContributors = async () => {
        if (!campaignAddress) return;
        const { data } = await supabase
            .from('donations')
            .select('donor_address')
            .eq('campaign_address', campaignAddress);
        
        if (data) {
            // Get unique contributors
            const unique = Array.from(new Set(data.map(d => d.donor_address)));
            setContributors(unique);
        }
    };

    useEffect(() => {
        fetchContributors();
    }, [campaignAddress]);

    // Watch tx confirmation
    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        const syncToSupabase = async () => {
            if (isConfirmed && pendingAmount && campaignAddress && address) {
                try {
                    await supabase.from('donations').insert({
                        donor_address: address,
                        campaign_address: campaignAddress,
                        amount_eth: pendingAmount
                    });
                    setPendingAmount("");
                    
                    refetchInfo();
                    refetchContribution();
                    fetchContributors();
                } catch (e) {
                    console.error("Failed to sync donation to Supabase", e);
                }
            }
        };
        syncToSupabase();
    }, [isConfirmed, receipt]);

    const contribute = (amountEth: string) => {
        if (!campaignAddress) return;
        setPendingAmount(amountEth);
        writeContract({
            address: campaignAddress,
            abi: CAMPAIGN_ABI,
            functionName: 'contribute',
            value: parseEther(amountEth),
        });
    };

    const info: CampaignInfo | null = rawInfo
        ? {
            creator: rawInfo.creator,
            title: rawInfo.title,
            description: rawInfo.description,
            fundingTarget: rawInfo.fundingTarget,
            deadline: rawInfo.deadline,
            totalFunded: rawInfo.totalFunded,
            goalReached: rawInfo.goalReached,
            fundsWithdrawn: rawInfo.fundsWithdrawn,
            isCancelled: rawInfo.isCancelled,
        }
        : null;

    return {
        info,
        contribution: contribution ?? 0n,
        contributors,
        contribute,
        refetchInfo,
        status: {
            isLoadingInfo,
            isContributing,
            isConfirming,
            isConfirmed,
            error: contributeError,
            txHash: hash,
        },
    };
}
