import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { parseEther, decodeEventLog } from 'viem';
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
        "name": "refund",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "refundAll",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "withdrawFunds",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
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
    },
    {
        "type": "function",
        "name": "getOutstandingRefundCount",
        "inputs": [],
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "RefundIssued",
        "inputs": [
            { "indexed": true, "name": "contributor", "type": "address" },
            { "indexed": false, "name": "amount", "type": "uint256" }
        ]
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
    const { writeContract, data: hash, isPending: isWriting, error: writeError } = useWriteContract();

    const [pendingAction, setPendingAction] = useState<{
        type: 'contribute' | 'refund' | 'refundAll' | 'withdraw';
        amountEth?: string;
    } | null>(null);
    const [info, setInfo] = useState<CampaignInfo | null>(null);
    const [contribution, setContribution] = useState<bigint>(0n);
    const [contributors, setContributors] = useState<string[]>([]);
    const [outstandingRefundCount, setOutstandingRefundCount] = useState<bigint>(0n);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);

    const fetchCampaignData = async () => {
        if (!campaignAddress || !publicClient) {
            setInfo(null);
            setContribution(0n);
            setContributors([]);
            setOutstandingRefundCount(0n);
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

            let refundCount = 0n;

            try {
                refundCount = await publicClient.readContract({
                    address: campaignAddress,
                    abi: CAMPAIGN_ABI,
                    functionName: 'getOutstandingRefundCount',
                }) as bigint;
            } catch (refundCountError) {
                console.warn(
                    'Failed to read getOutstandingRefundCount(). Falling back to client-side calculation for this campaign.',
                    refundCountError
                );

                const contributionAmounts = await Promise.all(
                    contributorList.map((contributor) =>
                        publicClient.readContract({
                            address: campaignAddress,
                            abi: CAMPAIGN_ABI,
                            functionName: 'getContribution',
                            args: [contributor],
                        }) as Promise<bigint>
                    )
                );

                refundCount = contributionAmounts.reduce(
                    (count, amount) => (amount > 0n ? count + 1n : count),
                    0n
                );
            }

            setInfo(campaignInfo);
            setContribution(connectedContribution);
            setContributors([...contributorList]);
            setOutstandingRefundCount(refundCount);
        } catch (err) {
            console.error('Failed to fetch campaign from chain', err);
            setInfo(null);
            setContribution(0n);
            setContributors([]);
            setOutstandingRefundCount(0n);
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
            if (!isConfirmed || !pendingAction || !campaignAddress) return;

            try {
                if (pendingAction.type === 'contribute' && pendingAction.amountEth && address) {
                    const { error } = await supabase.from('donations').insert({
                        donor_address: address,
                        campaign_address: campaignAddress,
                        amount_eth: pendingAction.amountEth,
                    });

                    if (error) {
                        throw error;
                    }
                }

                if (pendingAction.type === 'refund' || pendingAction.type === 'refundAll') {
                    const refundRows = receipt?.logs.flatMap((log) => {
                        try {
                            const decoded = decodeEventLog({
                                abi: CAMPAIGN_ABI,
                                data: log.data,
                                topics: log.topics,
                            });

                            if (decoded.eventName !== 'RefundIssued') {
                                return [];
                            }

                            return [{
                                campaign_address: campaignAddress,
                                user_address: decoded.args.contributor,
                                amount_eth: Number(decoded.args.amount) / 1e18,
                                tx_hash: receipt.transactionHash,
                            }];
                        } catch {
                            return [];
                        }
                    }) ?? [];

                    if (refundRows.length > 0) {
                        try {
                            const { error } = await supabase.from('refunds').insert(refundRows);
                            if (error) {
                                throw error;
                            }
                        } catch (refundSyncError) {
                            console.warn('Refund transaction confirmed, but failed to persist refund rows.', refundSyncError);
                        }
                    }
                }
            } catch (e) {
                console.error('Failed to sync campaign transaction to Supabase', e);
            } finally {
                setPendingAction(null);
                void fetchCampaignData();
            }
        };

        void syncToSupabase();
    }, [address, campaignAddress, isConfirmed, pendingAction, receipt, publicClient]);

    const contribute = (amountEth: string) => {
        if (!campaignAddress) return;

        setPendingAction({ type: 'contribute', amountEth });
        writeContract({
            address: campaignAddress,
            abi: CAMPAIGN_ABI,
            functionName: 'contribute',
            value: parseEther(amountEth),
        });
    };

    const refund = () => {
        if (!campaignAddress) return;

        setPendingAction({ type: 'refund' });
        writeContract({
            address: campaignAddress,
            abi: CAMPAIGN_ABI,
            functionName: 'refund',
        });
    };

    const refundAll = () => {
        if (!campaignAddress) return;

        setPendingAction({ type: 'refundAll' });
        writeContract({
            address: campaignAddress,
            abi: CAMPAIGN_ABI,
            functionName: 'refundAll',
        });
    };

    const withdrawFunds = () => {
        if (!campaignAddress) return;

        setPendingAction({ type: 'withdraw' });
        writeContract({
            address: campaignAddress,
            abi: CAMPAIGN_ABI,
            functionName: 'withdrawFunds',
        });
    };

    return {
        info,
        contribution,
        contributors,
        outstandingRefundCount,
        contribute,
        refund,
        refundAll,
        withdrawFunds,
        refetchInfo: fetchCampaignData,
        status: {
            isLoadingInfo,
            isContributing: isWriting && pendingAction?.type === 'contribute',
            isRefunding: isWriting && (pendingAction?.type === 'refund' || pendingAction?.type === 'refundAll'),
            isWithdrawing: isWriting && pendingAction?.type === 'withdraw',
            isConfirming,
            isConfirmed,
            error: writeError,
            txHash: hash,
        },
    };
}
