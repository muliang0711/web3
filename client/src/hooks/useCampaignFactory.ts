import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';

// TODO: Update this after deploying CampaignFactory
const FACTORY_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

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
        "type": "function",
        "name": "getCampaignCount",
        "inputs": [],
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view"
    }
] as const;

export function useCampaignFactory() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isCreating, error: createError } = useWriteContract();

    // Read all campaign addresses
    const { data: campaigns, refetch: refetchCampaigns, isLoading: isLoadingCampaigns } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getCampaigns',
    });

    // Read user's campaigns
    const { data: userCampaigns, refetch: refetchUserCampaigns } = useReadContract({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: 'getUserCampaigns',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // Watch for tx confirmation
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    useEffect(() => {
        if (isConfirmed) {
            refetchCampaigns();
            refetchUserCampaigns();
        }
    }, [isConfirmed, refetchCampaigns, refetchUserCampaigns]);

    const createCampaign = (title: string, description: string, targetEth: string, durationDays: number) => {
        writeContract({
            address: FACTORY_ADDRESS,
            abi: FACTORY_ABI,
            functionName: 'createCampaign',
            args: [title, description, parseEther(targetEth), BigInt(durationDays)],
        });
    };

    return {
        campaigns: (campaigns as `0x${string}`[] | undefined) ?? [],
        userCampaigns: (userCampaigns as `0x${string}`[] | undefined) ?? [],
        createCampaign,
        refetchCampaigns,
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
