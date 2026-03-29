const defaultUserRegistryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const defaultCampaignFactoryAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

export const USER_REGISTRY_ADDRESS = (
  import.meta.env.VITE_USER_REGISTRY_ADDRESS || defaultUserRegistryAddress
) as `0x${string}`;

export const CAMPAIGN_FACTORY_ADDRESS = (
  import.meta.env.VITE_CAMPAIGN_FACTORY_ADDRESS || defaultCampaignFactoryAddress
) as `0x${string}`;
