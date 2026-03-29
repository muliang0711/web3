import { useEffect, useState } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
    }
] as const;

export function useUserRegistry() {
    const { address } = useAccount();
    const { writeContract, data: hash, isPending: isRegistering, error: registerError } = useWriteContract();

    const [pendingName, setPendingName] = useState<string>("");

    // Supabase State
    const [donations, setDonations] = useState<any[]>([]);
    const [isReadingDonations, setIsReadingDonations] = useState(false);

    // Read User Data (still from blockchain to ensure extreme sync for login gate)
    const { data: userData, refetch: refetchUser, isLoading: isReading } = useReadContract({
        address: USER_REGISTRY_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getUser',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        },
    });

    // Fetch Donations from Supabase
    const fetchDonations = async () => {
        if (!address) return;
        setIsReadingDonations(true);
        const { data } = await supabase
            .from('donations')
            .select('*')
            .eq('donor_address', address)
            .order('created_at', { ascending: false });
        if (data) setDonations(data);
        setIsReadingDonations(false);
    };

    useEffect(() => {
        fetchDonations();
    }, [address]);

    // Watch for Transaction Success to auto-refresh and insert to Supabase
    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    useEffect(() => {
        const syncToSupabase = async () => {
            if (isConfirmed && pendingName) {
                try {
                    await supabase.from('users').insert({
                        wallet_address: address,
                        name: pendingName
                    });
                    setPendingName("");
                    refetchUser();
                } catch (e) {
                    console.error("Failed to sync new user to Supabase", e);
                }
            }
        };
        syncToSupabase();
    }, [isConfirmed, receipt]);

    const register = (name: string) => {
        if (userData?.isRegistered) {
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
        user: userData ? { name: userData.name, isRegistered: userData.isRegistered } : null,
        donations,
        register,
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
