import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';

const CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
const CONTRACT_ABI = [
    {
        "type": "function",
        "name": "getUserDonations",
        "inputs": [{ "name": "_userAddress", "type": "address" }],
        "outputs": [
            {
                "type": "tuple[]",
                "components": [
                    { "name": "campaign", "type": "address" },
                    { "name": "amount", "type": "uint256" },
                    { "name": "timestamp", "type": "uint256" }
                ]
            }
        ],
        "stateMutability": "view"
    },
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

    // Read User Data
    const { data: userData, refetch: refetchUser, isLoading: isReading } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getUser',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        },
    });

    // Read User Donations
    const { data: userDonationsData, refetch: refetchDonations, isLoading: isReadingDonations } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getUserDonations',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        },
    });

    // Watch for Transaction Success to auto-refresh
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash,
    });

    // Trigger auto-refresh when transaction confirms
    useEffect(() => {
        if (isConfirmed) {
            refetchUser();
            refetchDonations();
        }
    }, [isConfirmed, refetchUser, refetchDonations]);

    const register = (name: string) => {
        if (userData?.isRegistered) {
            alert(`you already register with this wallet addres :${address}！`);
            return;
        }
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'register',
            args: [name],
        });
    };

    return {
        user: userData ? { name: userData.name, isRegistered: userData.isRegistered } : null,
        donations: Array.isArray(userDonationsData) ? userDonationsData : [],
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
