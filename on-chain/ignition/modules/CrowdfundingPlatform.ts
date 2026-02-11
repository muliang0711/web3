import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrowdfundingPlatformModule = buildModule(
    "CrowdfundingPlatformModule",
    (m) => {
        // Deploy the CrowdfundingPlatform contract first
        const platform = m.contract("CrowdfundingPlatform");

        // Deploy RewardToken with the platform address
        const rewardToken = m.contract("RewardToken", [platform]);

        return { platform, rewardToken };
    }
);

export default CrowdfundingPlatformModule;
