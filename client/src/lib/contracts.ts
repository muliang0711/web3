const defaultUserRegistryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const defaultCampaignFactoryAddress = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const defaultRewardTokenAddress = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
const defaultRewardManagerAddress = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';

export const USER_REGISTRY_ADDRESS = (
  import.meta.env.VITE_USER_REGISTRY_ADDRESS || defaultUserRegistryAddress
) as `0x${string}`;

export const CAMPAIGN_FACTORY_ADDRESS = (
  import.meta.env.VITE_CAMPAIGN_FACTORY_ADDRESS || defaultCampaignFactoryAddress
) as `0x${string}`;

export const REWARD_TOKEN_ADDRESS = (
  import.meta.env.VITE_REWARD_TOKEN_ADDRESS || defaultRewardTokenAddress
) as `0x${string}`;

export const REWARD_MANAGER_ADDRESS = (
  import.meta.env.VITE_REWARD_MANAGER_ADDRESS || defaultRewardManagerAddress
) as `0x${string}`;
