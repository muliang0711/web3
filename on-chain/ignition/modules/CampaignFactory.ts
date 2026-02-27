import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CampaignFactoryModule = buildModule("CampaignFactoryModule", (m) => {
    const campaignFactory = m.contract("CampaignFactory");

    return { campaignFactory };
});

export default CampaignFactoryModule;
