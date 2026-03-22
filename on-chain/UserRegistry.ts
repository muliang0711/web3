import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const UserRegistryModule = buildModule("UserRegistryModule", (m) => {
    // 1. Deploy the RewardToken contract first
    const rewardToken = m.contract("RewardToken");

    // 2. Deploy UserRegistry and pass the RewardToken address to its constructor
    // This allows the Registry to know WHICH token to transfer
    const userRegistry = m.contract("UserRegistry", [rewardToken]);

    // 3. TRANSFER OWNERSHIP of the RewardToken to the UserRegistry
    // This is critical: Only the owner can call 'distributeReward'
    m.call(rewardToken, "transferOwnership", [userRegistry]);

    // 4. INITIALIZE THE TREASURY
    // Mint 1,000,000 tokens to the RewardToken contract itself 
    // This creates the "pool" that will be transferred to donors
    // BigInt is used because Solidity handles 18 decimals (10^18)
    const initialSupply = BigInt(1000000) * BigInt(10 ** 18);
    
    m.call(rewardToken, "mint", [rewardToken, initialSupply]);

    return { rewardToken, userRegistry };
});

export default UserRegistryModule;
