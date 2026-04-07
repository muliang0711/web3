import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAccount } from 'wagmi';
import { supabase } from '../lib/supabase';
import { USER_REGISTRY_ADDRESS } from '../lib/contracts';
import { getProfileImagePath, getProfileImageUrl, uploadMediaFile } from '../lib/media';
import { enrichDonationRowsWithChainTimestamps } from '../lib/chainActivity';
import { fetchRegistrationTimestampForAddress } from '../lib/userRegistration';

const CONTRACT_ABI = [
    {
        "type": "function",
        "name": "register",
        "inputs": [{ "name": "_name", "type": "string" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getUser",
        "inputs": [{ "name": "_userAddress", "type": "address" }],
        "outputs": [
            {
                "type": "tuple",
                "components": [
                    { "name": "name", "type": "string" },
                    { "name": "isRegistered", "type": "bool" }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getClaimableRewards",
        "inputs": [{ "name": "_user", "type": "address" }],
        "outputs": [{ "type": "uint256" }],
        "stateMutability": "view"
    }
] as const;

type AppUser = {
    name: string;
    isRegistered: boolean;
    walletAddress: string;
    createdAt?: string | null;
    claimableRewards?: string | number | null;
    profileImageUrl?: string | null;
};

const USER_LOOKUP_TIMEOUT_MS = 8000;
type ChainUser = {
    name: string;
    isRegistered: boolean;
};

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

async function fetchUserRowByAddress(address: string) {
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

    return data?.[0] ?? null;
}

async function fetchUserByAddress(publicClient: NonNullable<ReturnType<typeof usePublicClient>>, address: string): Promise<AppUser | null> {
    let row: any = null;

    try {
        row = await fetchUserRowByAddress(address);
    } catch (error) {
        console.warn('Failed to load user row from Supabase, falling back to chain data only.', error);
    }

    const [chainUser, claimableRewards, registeredAt] = await Promise.all([
        publicClient.readContract({
            address: USER_REGISTRY_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getUser',
            args: [address as `0x${string}`],
        }) as Promise<ChainUser>,
        publicClient.readContract({
            address: USER_REGISTRY_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getClaimableRewards',
            args: [address as `0x${string}`],
        }) as Promise<bigint>,
        fetchRegistrationTimestampForAddress(publicClient, address).catch((error) => {
            console.warn('Failed to load on-chain registration timestamp, falling back to database created_at.', error);
            return row?.created_at ?? null;
        }),
    ]);

    if (!row && !chainUser.isRegistered) {
        return null;
    }

    return {
        name: chainUser.isRegistered ? chainUser.name : row?.name ?? '',
        isRegistered: chainUser.isRegistered || Boolean(row),
        walletAddress: row?.wallet_address ?? address,
        createdAt: registeredAt ?? row?.created_at ?? null,
        claimableRewards: formatEther(claimableRewards),
        profileImageUrl: row?.profile_image_url ?? row?.avatar_url ?? row?.image_url ?? getProfileImageUrl(address),
    };
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
    const publicClient = usePublicClient();
    const queryClient = useQueryClient();
    const { writeContract, data: hash, isPending: isRegistering, error: registerError } = useWriteContract();

    const [pendingName, setPendingName] = useState<string>('');
    const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
    const userQueryKey = ['userRegistryUser', address, publicClient?.chain?.id] as const;

    const userQuery = useQuery({
        queryKey: userQueryKey,
        queryFn: () => fetchUserByAddress(publicClient!, address!),
        enabled: Boolean(address && publicClient),
        staleTime: 1000 * 30,
        retry: 1,
    });

    const donationsQuery = useQuery({
        queryKey: ['userRegistryDonations', address],
        queryFn: async () => {
            const donationRows = await fetchDonationsByAddress(address!);

            if (!publicClient) {
                return donationRows;
            }

            try {
                return await enrichDonationRowsWithChainTimestamps(publicClient, donationRows);
            } catch (error) {
                console.warn('Failed to load on-chain donation timestamps, falling back to database created_at.', error);
                return donationRows;
            }
        },
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
                const registeredAt = publicClient
                    ? await fetchRegistrationTimestampForAddress(publicClient, address).catch(() => null)
                    : null;

                await supabase.from('users').insert({
                    wallet_address: address,
                    name: pendingName,
                });

                queryClient.setQueryData(userQueryKey, {
                    name: pendingName,
                    isRegistered: true,
                    walletAddress: address,
                    createdAt: registeredAt,
                    claimableRewards: '0',
                    profileImageUrl: getProfileImageUrl(address),
                } satisfies AppUser);

                await queryClient.invalidateQueries({ queryKey: ['userRegistryUser', address] });
            } catch (e) {
                console.error('Failed to sync new user to Supabase', e);
            } finally {
                setPendingName('');
            }
        };

        syncToSupabase();
    }, [address, isConfirmed, pendingName, publicClient, queryClient, receipt]);

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

    const uploadProfileImage = async (file: File) => {
        if (!address) {
            throw new Error('Wallet not connected');
        }

        setIsUploadingProfileImage(true);
        try {
            const path = getProfileImagePath(address);
            const publicUrl = await uploadMediaFile(file, path);

            try {
                const { error } = await supabase
                    .from('users')
                    .update({ profile_image_url: publicUrl })
                    .ilike('wallet_address', address);

                if (error) {
                    throw error;
                }
            } catch (profileSyncError) {
                console.warn('Profile image uploaded, but failed to persist profile_image_url column.', profileSyncError);
            }

            await queryClient.invalidateQueries({ queryKey: ['userRegistryUser', address] });
            return publicUrl;
        } finally {
            setIsUploadingProfileImage(false);
        }
    };

    const hasResolvedUser = !address || !publicClient || userQuery.isFetched || userQuery.isError;
    const isReading = Boolean(address && publicClient) && !hasResolvedUser;

    return {
        user: userQuery.data ?? null,
        donations: donationsQuery.data ?? [],
        register,
        uploadProfileImage,
        refetchUser: userQuery.refetch,
        refetchDonations: donationsQuery.refetch,
        status: {
            isRegistering,
            isConfirming,
            isUploadingProfileImage,
            isReading,
            isReadingDonations: donationsQuery.isPending || donationsQuery.isFetching,
            hasResolvedUser,
            userLookupError: userQuery.error instanceof Error ? userQuery.error.message : null,
            error: registerError,
            txHash: hash
        }
    };
}
