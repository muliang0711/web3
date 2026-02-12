import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const rawKey = process.env.SEPOLIA_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!rawKey) {
        console.error("❌ No private key found in .env");
        return;
    }

    const key = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
    const account = privateKeyToAccount(key as `0x${string}`);

    console.log("🔑 Private key loaded (first 6 chars):", key.slice(0, 8) + "...");
    console.log("📍 Derived address:", account.address);

    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    console.log("🌐 RPC URL:", rpcUrl);

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(rpcUrl),
    });

    try {
        const balance = await publicClient.getBalance({ address: account.address });
        console.log("💰 Balance:", formatEther(balance), "ETH");

        if (balance === 0n) {
            console.log("\n❌ Your account has 0 ETH on Sepolia!");
            console.log("   Get testnet ETH from: https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
        } else {
            console.log("\n✅ Account has ETH. Deployment should work.");
        }

        const chainId = await publicClient.getChainId();
        console.log("🔗 Chain ID:", chainId);
    } catch (err: any) {
        console.error("❌ RPC connection failed:", err.message);
    }
}

main();
