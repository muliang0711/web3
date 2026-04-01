import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import { USER_REGISTRY_ADDRESS } from '../lib/contracts';

const CONTRACT_ABI = [
    {
        "type": "function",
        "name": "register",
        "inputs": [{ "name": "_name", "type": "string" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    }
] as const;

type AppUser = {
    name: string;
    isRegistered: boolean;
    walletAddress: string;
    createdAt?: string | null;
    claimableRewards?: string | number | null;
};

const USER_LOOKUP_TIMEOUT_MS = 8000;

function withTimeout<T>(promiseLike: PromiseLike<T>, label: string, timeoutMs = USER_LOOKUP_TIMEOUT_MS): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        Promise.resolve(promiseLike)
            .then((value) => {
                window.clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                window.clearTimeout(timer);
                reject(error);
            });
    });
}

async function fetchUserByAddress(address: string): Promise<AppUser | null> {
    const { data, error } = await withTimeout(
        supabase
            .from('users')
            .select('*')
            .ilike('wallet_address', address)
            .order('created_at', { ascending: false })
            .limit(1),
        'User lookup'
    );

    if (error) throw error;

    const row = data?.[0];
    return row ? {
        name: row.name,
        isRegistered: true,
        walletAddress: row.wallet_address,
        createdAt: row.created_at,
        claimableRewards: row.claimable_rewards ?? row.claimableRewards ?? null,
    } : null;
}

async function fetchDonationsByAddress(address: string) {
    const { data, error } = await supabase
        .from('donations')
        .select('*')
        .ilike('donor_address', address)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const donationsData = data ?? [];
    const campaignAddresses = Array.from(new Set(donationsData.map((donation: any) => donation.campaign_address).filter(Boolean)));

    if (campaignAddresses.length === 0) {
        return donationsData;
    }

    const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('address, title')
        .in('address', campaignAddresses);

    if (campaignsError) throw campaignsError;

    const campaignMap = new Map((campaigns ?? []).map((campaign: any) => [campaign.address, campaign.title]));
    return donationsData.map((donation: any) => ({
        ...donation,
        campaign_name: campaignMap.get(donation.campaign_address) || donation.campaign_name || 'Campaign Donation',
    }));
}

export function useUserRegistry() {
    const { address } = useAccount();
    const queryClient = useQueryClient();
    const { writeContract, data: hash, isPending: isRegistering, error: registerError } = useWriteContract();

    const [pendingName, setPendingName] = useState<string>('');

    const userQuery = useQuery({
        queryKey: ['userRegistryUser', address],
        queryFn: () => fetchUserByAddress(address!),
        enabled: Boolean(address),
        staleTime: 1000 * 30,
        retry: 1,
    });

    const donationsQuery = useQuery({
        queryKey: ['userRegistryDonations', address],
        queryFn: () => fetchDonationsByAddress(address!),
        enabled: Boolean(address),
        staleTime: 1000 * 30,
        retry: 1,
    });

    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        const syncToSupabase = async () => {
            if (!isConfirmed || !pendingName || !address) return;

            try {
                await supabase.from('users').insert({
                    wallet_address: address,
                    name: pendingName,
                });

                queryClient.setQueryData(['userRegistryUser', address], {
                    name: pendingName,
                    isRegistered: true,
                    walletAddress: address,
                    createdAt: new Date().toISOString(),
                    claimableRewards: null,
                } satisfies AppUser);

                await queryClient.invalidateQueries({ queryKey: ['userRegistryUser', address] });
            } catch (e) {
                console.error('Failed to sync new user to Supabase', e);
            } finally {
                setPendingName('');
            }
        };

        syncToSupabase();
    }, [address, isConfirmed, pendingName, queryClient, receipt]);

    const register = (name: string) => {
        if (userQuery.data?.isRegistered) {
            alert(`You are already registered with this wallet address: ${address}!`);
            return;
        }

        setPendingName(name);

        writeContract({
            address: USER_REGISTRY_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'register',
            args: [name],
        });
    };

    const hasResolvedUser = !address || userQuery.isFetched || userQuery.isError;
    const isReading = Boolean(address) && !hasResolvedUser;

    return {
        user: userQuery.data ?? null,
        donations: donationsQuery.data ?? [],
        register,
        refetchUser: userQuery.refetch,
        refetchDonations: donationsQuery.refetch,
        status: {
            isRegistering,
            isConfirming,
            isReading,
            isReadingDonations: donationsQuery.isPending || donationsQuery.isFetching,
            hasResolvedUser,
            userLookupError: userQuery.error instanceof Error ? userQuery.error.message : null,
            error: registerError,
            txHash: hash
        }
    };
}
