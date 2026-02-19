import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAccount } from 'wagmi';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
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
    if (isConfirmed) {
        refetch();
    }

    const register = (name: string) => {
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
