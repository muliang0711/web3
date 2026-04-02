import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import CampaignFactoryModule from "./CampaignFactory";

const RewardSystemModule = buildModule("RewardSystemModule", (m) => {
    const { userRegistry, campaignFactory } = m.useModule(CampaignFactoryModule);
    const rewardToken = m.contract("RewardToken", [], { after: [campaignFactory] });
    const rewardManager = m.contract("RewardManager", [rewardToken, userRegistry]);

    m.call(userRegistry, "setRewardManager", [rewardManager]);
    m.call(rewardToken, "transferOwnership", [rewardManager]);

    return {
        userRegistry,
        campaignFactory,
        rewardToken,
        rewardManager,
    };
});

export default RewardSystemModule;
