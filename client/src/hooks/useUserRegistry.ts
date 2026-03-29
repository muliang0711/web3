import { useEffect, useState } from 'react';
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

export function useUserRegistry() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isRegistering, error: registerError } = useWriteContract();

    const [pendingName, setPendingName] = useState<string>('');
    const [user, setUser] = useState<AppUser | null>(null);
    const [donations, setDonations] = useState<any[]>([]);
    const [isReading, setIsReading] = useState(false);
    const [isReadingDonations, setIsReadingDonations] = useState(false);

    const fetchUser = async () => {
        if (!address) {
            setUser(null);
            return;
        }

        setIsReading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('wallet_address', address)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            const row = data?.[0];
            setUser(row ? {
                name: row.name,
                isRegistered: true,
                walletAddress: row.wallet_address,
                createdAt: row.created_at,
                claimableRewards: row.claimable_rewards ?? row.claimableRewards ?? null,
            } : null);
        } catch (e) {
            console.error('Failed to fetch user from Supabase', e);
            setUser(null);
        } finally {
            setIsReading(false);
        }
    };

    const fetchDonations = async () => {
        if (!address) {
            setDonations([]);
            return;
        }

        setIsReadingDonations(true);
        try {
            const { data, error } = await supabase
                .from('donations')
                .select('*')
                .eq('donor_address', address)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const donationsData = data ?? [];
            const campaignAddresses = Array.from(new Set(donationsData.map((donation: any) => donation.campaign_address).filter(Boolean)));

            if (campaignAddresses.length === 0) {
                setDonations(donationsData);
                return;
            }

            const { data: campaigns, error: campaignsError } = await supabase
                .from('campaigns')
                .select('address, title')
                .in('address', campaignAddresses);

            if (campaignsError) throw campaignsError;

            const campaignMap = new Map((campaigns ?? []).map((campaign: any) => [campaign.address, campaign.title]));
            setDonations(donationsData.map((donation: any) => ({
                ...donation,
                campaign_name: campaignMap.get(donation.campaign_address) || donation.campaign_name || 'Campaign Donation',
            })));
        } catch (e) {
            console.error('Failed to fetch donations from Supabase', e);
            setDonations([]);
        } finally {
            setIsReadingDonations(false);
        }
    };

    useEffect(() => {
        fetchUser();
        fetchDonations();
    }, [address]);

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
            } catch (e) {
                console.error('Failed to sync new user to Supabase', e);
            } finally {
                setPendingName('');
                fetchUser();
            }
        };

        syncToSupabase();
    }, [address, isConfirmed, pendingName, receipt]);

    const register = (name: string) => {
        if (user?.isRegistered) {
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

    return {
        user,
        donations,
        register,
        refetchUser: fetchUser,
        refetchDonations: fetchDonations,
        status: {
            isRegistering,
            isConfirming,
            isReading,
            isReadingDonations,
            error: registerError,
            txHash: hash
        }
    };
}
