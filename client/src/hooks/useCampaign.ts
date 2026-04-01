import { useEffect, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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

const toWei = (value: string | number | null | undefined) => {
    const normalized = value == null ? '0' : String(value);
    try {
        return parseEther(normalized);
    } catch {
        return 0n;
    }
};

const getDeadlineSeconds = (row: any) => {
    if (row?.deadline != null) {
        if (typeof row.deadline === 'number') return BigInt(row.deadline);
        const parsed = Date.parse(String(row.deadline));
        if (!Number.isNaN(parsed)) return BigInt(Math.floor(parsed / 1000));
    }

    const createdAtMs = row?.created_at ? Date.parse(String(row.created_at)) : Number.NaN;
    const durationDays = Number(row?.duration_days ?? 0);

    if (Number.isNaN(createdAtMs) || !Number.isFinite(durationDays)) {
        return 0n;
    }

    return BigInt(Math.floor((createdAtMs + durationDays * 86400000) / 1000));
};

export function useCampaign(campaignAddress?: `0x${string}`) {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isContributing, error: contributeError } = useWriteContract();

    const [pendingAmount, setPendingAmount] = useState<string>('');
    const [contributors, setContributors] = useState<string[]>([]);
    const [campaignRow, setCampaignRow] = useState<any>(null);
    const [campaignDonations, setCampaignDonations] = useState<any[]>([]);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);

    const fetchCampaignData = async () => {
        if (!campaignAddress) {
            setCampaignRow(null);
            setCampaignDonations([]);
            setContributors([]);
            return;
        }

        setIsLoadingInfo(true);
        try {
            const [campaignResult, donationsResult] = await Promise.all([
                supabase
                    .from('campaigns')
                    .select('*')
                    .ilike('address', campaignAddress)
                    .limit(1),
                supabase
                    .from('donations')
                    .select('*')
                    .ilike('campaign_address', campaignAddress)
                    .order('created_at', { ascending: true }),
            ]);

            if (campaignResult.error) throw campaignResult.error;
            if (donationsResult.error) throw donationsResult.error;

            const row = campaignResult.data?.[0] ?? null;
            const donationRows = donationsResult.data ?? [];

            setCampaignRow(row);
            setCampaignDonations(donationRows);
            setContributors(Array.from(new Set(donationRows.map((donation: any) => donation.donor_address))));
        } catch (err) {
            console.error('Failed to fetch campaign from Supabase', err);
            setCampaignRow(null);
            setCampaignDonations([]);
            setContributors([]);
        } finally {
            setIsLoadingInfo(false);
        }
    };

    useEffect(() => {
        fetchCampaignData();
    }, [campaignAddress, address]);

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
                fetchCampaignData();
            }
        };

        syncToSupabase();
    }, [address, campaignAddress, isConfirmed, pendingAmount, receipt]);

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

    const fundingTarget = toWei(campaignRow?.target_eth);
    const totalFunded = campaignDonations.reduce((sum, donation) => sum + toWei(donation.amount_eth), 0n);
    const contribution = address
        ? campaignDonations
            .filter(donation => donation.donor_address?.toLowerCase() === address.toLowerCase())
            .reduce((sum, donation) => sum + toWei(donation.amount_eth), 0n)
        : 0n;
    const deadline = getDeadlineSeconds(campaignRow);
    const goalReached = fundingTarget > 0n && totalFunded >= fundingTarget;

    const info: CampaignInfo | null = campaignRow
        ? {
            creator: (campaignRow.creator_address || '0x0000000000000000000000000000000000000000') as `0x${string}`,
            title: campaignRow.title || 'Untitled Campaign',
            description: campaignRow.description || '',
            fundingTarget,
            deadline,
            totalFunded,
            goalReached,
            fundsWithdrawn: Boolean(campaignRow.funds_withdrawn),
            isCancelled: Boolean(campaignRow.is_cancelled),
        }
        : null;

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
