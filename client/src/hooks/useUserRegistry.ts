import { useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';

const CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
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

    // Read User Data
    const { data: userData, refetch, isLoading: isReading } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getUser',
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
            refetch();
        }
    }, [isConfirmed, refetch]);

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
        register,
        status: {
            isRegistering,
            isConfirming,
            isReading,
            error: registerError,
            txHash: hash
        }
    };
}
