import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { supabase } from '../lib/supabase';

const CAMPAIGN_ABI = [
    {
        "type": "function",
        "name": "contribute",
        "inputs": [],
        "outputs": [],
        "stateMutability": "payable"
    },
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
        "name": "getContributors",
        "inputs": [],
        "outputs": [{ "type": "address[]" }],
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
    const publicClient = usePublicClient();
    const { writeContract, data: hash, isPending: isContributing, error: contributeError } = useWriteContract();

    const [pendingAmount, setPendingAmount] = useState<string>('');
    const [info, setInfo] = useState<CampaignInfo | null>(null);
    const [contribution, setContribution] = useState<bigint>(0n);
    const [contributors, setContributors] = useState<string[]>([]);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);

    const fetchCampaignData = async () => {
        if (!campaignAddress || !publicClient) {
            setInfo(null);
            setContribution(0n);
            setContributors([]);
            return;
        }

        setIsLoadingInfo(true);
        try {
            const [campaignInfo, contributorList, connectedContribution] = await Promise.all([
                publicClient.readContract({
                    address: campaignAddress,
                    abi: CAMPAIGN_ABI,
                    functionName: 'getCampaignInfo',
                }) as Promise<CampaignInfo>,
                publicClient.readContract({
                    address: campaignAddress,
                    abi: CAMPAIGN_ABI,
                    functionName: 'getContributors',
                }) as Promise<readonly `0x${string}`[]>,
                address
                    ? publicClient.readContract({
                        address: campaignAddress,
                        abi: CAMPAIGN_ABI,
                        functionName: 'getContribution',
                        args: [address],
                    }) as Promise<bigint>
                    : Promise.resolve(0n),
            ]);

            setInfo(campaignInfo);
            setContribution(connectedContribution);
            setContributors([...contributorList]);
        } catch (err) {
            console.error('Failed to fetch campaign from chain', err);
            setInfo(null);
            setContribution(0n);
            setContributors([]);
        } finally {
            setIsLoadingInfo(false);
        }
    };

    useEffect(() => {
        void fetchCampaignData();
    }, [address, campaignAddress, publicClient]);

    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        const syncToSupabase = async () => {
            if (!isConfirmed || !pendingAmount || !campaignAddress || !address) return;

            try {
                await supabase.from('donations').insert({
                    donor_address: address,
                    campaign_address: campaignAddress,
                    amount_eth: pendingAmount,
                });
            } catch (e) {
                console.error('Failed to sync donation to Supabase', e);
            } finally {
                setPendingAmount('');
                void fetchCampaignData();
            }
        };

        void syncToSupabase();
    }, [address, campaignAddress, isConfirmed, pendingAmount, receipt, publicClient]);

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

    return {
        info,
        contribution,
        contributors,
        contribute,
        refetchInfo: fetchCampaignData,
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
