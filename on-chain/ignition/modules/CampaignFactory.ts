import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import UserRegistryModule from "./UserRegistry";

const CampaignFactoryModule = buildModule("CampaignFactoryModule", (m) => {
    const { userRegistry } = m.useModule(UserRegistryModule);
    const campaignFactory = m.contract("CampaignFactory", [userRegistry]);
    m.call(userRegistry, "setCampaignFactory", [campaignFactory]);

    return { userRegistry, campaignFactory };
});

export default CampaignFactoryModule;
