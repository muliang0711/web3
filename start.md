# Start Guide

This guide reflects the current repo state in `c:\Code\project\web3` as of April 2, 2026.

## 1. Current project structure

### On-chain contracts

- `UserRegistry.sol`
- `CampaignFactory.sol`
- `Campaign.sol`
- `RewardToken.sol`
- `RewardManager.sol`

### What is wired today

- The frontend runs against Hardhat local chain `31337`.
- Core contract addresses are loaded from `client/src/lib/contracts.ts`.
- The frontend uses Supabase for user rows, campaign metadata, and donation history tables.
- Claimable rewards come from the blockchain through `UserRegistry.getClaimableRewards(...)`.

### Reward flow now implemented

Current runtime behavior:

1. A factory-created campaign is authorized in `UserRegistry`.
2. When a user donates through `Campaign.contribute()`, the campaign records the donation in `UserRegistry`.
3. `UserRegistry` increases `claimableRewards` 1:1 with the donated amount.
4. `RewardManager.claimRewards()` reads the user reward amount, resets it in `UserRegistry`, and mints CFR through `RewardToken`.

Refund behavior now implemented:

1. When a donation is refunded, the campaign reverses the linked reward amount in `UserRegistry`.
2. If the reward is still unclaimed, `claimableRewards` is reduced directly.
3. If the reward was already claimed, `RewardManager` burns the matching CFR amount from the user's token balance.

Security note:

- `UserRegistry.recordDonation(...)` now only accepts calls from authorized campaign contracts created by `CampaignFactory`.

## 2. One-time setup

From repo root:

```powershell
cd c:\Code\project\web3
```

Install on-chain dependencies:

```powershell
cd .\on-chain
npm install
```

Install client dependencies:

```powershell
cd ..\client
npm install
```

## 3. Client environment

Create `client/.env` with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_MEDIA_BUCKET=app-media
```

Optional contract overrides:

```env
VITE_USER_REGISTRY_ADDRESS=0x...
VITE_CAMPAIGN_FACTORY_ADDRESS=0x...
VITE_REWARD_TOKEN_ADDRESS=0x...
VITE_REWARD_MANAGER_ADDRESS=0x...
```

Notes:

- If Supabase env vars are missing, the frontend can still load, but user sync, campaign metadata sync, and donation history sync will fail.
- The repo now includes a bootstrap SQL file at `supabase/setup.sql` for the required tables, policies, and storage bucket.
- The client expects a public storage bucket named `app-media` unless you override `VITE_SUPABASE_MEDIA_BUCKET`.
- If you use the standard local deployment flow below on a fresh chain, the default addresses in `client/src/lib/contracts.ts` already match it.

## 3A. Supabase bootstrap

Create a Supabase project, then in the dashboard:

1. Open `SQL Editor`.
2. Paste and run `c:\Code\project\web3\supabase\setup.sql`.
3. Copy the project URL and anon key into `client/.env`.

This SQL creates:

- `users`
- `campaigns`
- `donations`
- `refunds`
- public storage bucket `app-media`

Current app behavior depends on those resources:

- user registration writes to `users`
- campaign metadata and image URLs write to `campaigns`
- donation history writes to `donations`
- refund history writes to `refunds`
- campaign and profile images upload to `app-media`

## 4. Verify the codebase before running

From `on-chain`:

```powershell
cd c:\Code\project\web3\on-chain
npx hardhat test
```

From `client`:

```powershell
cd c:\Code\project\web3\client
npm run build
```

Current status from this repo snapshot:

- `npx hardhat test` passes.
- `npm run build` passes.

## 5. Fast start

From repo root, you can now start the local stack with one command:

```powershell
cd c:\Code\project\web3
npm run dev
```

What it does:

1. Opens a new terminal window for `npx hardhat node`
2. Waits for the local RPC at `http://127.0.0.1:8545`
3. Deploys `ignition/modules/RewardSystem.ts`
4. Opens a new terminal window for `npm run dev` in `client`

If you already have a local node and deployment running, use:

```powershell
npm run dev:skip-deploy
```

## 6. Manual start local blockchain

Open Terminal A:

```powershell
cd c:\Code\project\web3\on-chain
npx hardhat node
```

Keep this terminal running.

## 7. Deploy the full reward-enabled stack

Open Terminal B:

```powershell
cd c:\Code\project\web3\on-chain
npx hardhat ignition deploy --network localhost ignition/modules/RewardSystem.ts
```

This module deploys and wires:

1. `UserRegistry`
2. `CampaignFactory`
3. `UserRegistry.setCampaignFactory(...)`
4. `RewardToken`
5. `RewardManager`
6. `UserRegistry.setRewardManager(...)`
7. `RewardToken.transferOwnership(...)` to `RewardManager`

## 8. Verify deployed addresses

Check:

```powershell
Get-Content c:\Code\project\web3\on-chain\ignition\deployments\chain-31337\deployed_addresses.json
```

Expected addresses on a clean local deployment:

- `UserRegistryModule#UserRegistry` -> `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- `CampaignFactoryModule#CampaignFactory` -> `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- `RewardSystemModule#RewardToken` -> `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
- `RewardSystemModule#RewardManager` -> `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`

If your addresses differ:

1. Put them in `client/.env`.
2. Restart the Vite dev server.

## 9. Start the frontend

Open Terminal C:

```powershell
cd c:\Code\project\web3\client
npm run dev
```

Open the local URL shown by Vite.

## 10. Wallet setup

In MetaMask:

1. Add or switch to the local Hardhat network.
2. Use RPC URL `http://127.0.0.1:8545`.
3. Use Chain ID `31337`.
4. Use currency symbol `ETH`.
5. Import one of the private keys printed by `npx hardhat node`.

## 11. Reward-enabled test flow

This is the current local end-to-end flow:

1. Open `/login` and connect wallet.
2. Open `/register` and register a user.
3. Open `/campaigns/create` and create a campaign.
4. Open the campaign detail page and donate from another wallet.
5. Open `/profile` for the donor wallet.
6. Confirm `Claimable Rewards` increased.
7. Click `Claim Tokens`.

Expected result:

- `Claimable Rewards` drops to `0`.
- CFR tokens are minted by `RewardToken` through `RewardManager`.

## 12. If things break

- `ContractFunctionExecutionError` or read revert:
  Usually wrong network, wrong address, or contracts were not deployed after a local node reset.
- Donation fails with an authorization-style revert:
  The campaign stack was not deployed with `RewardSystem.ts`, or `UserRegistry.setCampaignFactory(...)` was not executed.
- Claim button is visible but claim fails:
  Check `RewardManager` address, deployment wiring, and wallet network.
- UI loads but history or names are missing:
  Check `client/.env` and Supabase connectivity.
- Local node restarted:
  Re-run `npm run dev`, or manually repeat the deployment command from Section 7.
