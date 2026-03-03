# Start Guide: Run On-Chain Backend For Frontend Testing

This guide is based on the current codebase in `web3/`.

## Current setup (important)

- Frontend chain config is Hardhat local chain (`chainId: 31337`) in `client/src/providers/wagmi.ts`.
- Frontend uses hardcoded contract addresses:
  - `UserRegistry`: `0x5FbDB2315678afecb367f032d93F642f64180aa3` in `client/src/hooks/useUserRegistry.ts`
  - `CampaignFactory`: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` in `client/src/hooks/useCampaignFactory.ts`
- To match these addresses on a fresh local node, deploy in this order:
  1. `UserRegistry`
  2. `CampaignFactory`

## 1. Install dependencies (one time)

Open terminal at repo root:

```powershell
cd c:\Code\project\web3
```

Install on-chain deps:

```powershell
cd on-chain
npm install
```

Install client deps:

```powershell
cd ..\client
npm install
```

If compile fails with OpenZeppelin import error, run:

```powershell
cd ..\on-chain
npm install @openzeppelin/contracts
```

## 2. Start local blockchain (Terminal A)

```powershell
cd c:\Code\project\web3\on-chain
npx hardhat node
```

Keep this terminal running.

## 3. Deploy contracts to local node (Terminal B)

```powershell
cd c:\Code\project\web3\on-chain
npx hardhat ignition deploy --network localhost ignition/modules/UserRegistry.ts
npx hardhat ignition deploy --network localhost ignition/modules/CampaignFactory.ts
```

## 4. Verify deployed addresses

```powershell
Get-Content c:\Code\project\web3\on-chain\ignition\deployments\chain-31337\deployed_addresses.json
```

Expected on fresh chain:

- `UserRegistryModule#UserRegistry` -> `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- `CampaignFactoryModule#CampaignFactory` -> `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

If your addresses differ, update:

- `client/src/hooks/useUserRegistry.ts`
- `client/src/hooks/useCampaignFactory.ts`

## 5. Start frontend (Terminal C)

```powershell
cd c:\Code\project\web3\client
npm run dev
```

Open the local URL shown by Vite.

## 6. Wallet setup for testing

In MetaMask:

1. Add/switch to local network:
   - RPC: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Symbol: `ETH`
2. Import one Hardhat account private key from Terminal A output.
3. Connect wallet in `/login`.

## 7. Quick test flow

1. Connect wallet on `/login`
2. Register on `/register`
3. Create campaign on `/campaigns`
4. Open campaign detail and donate
5. Check profile donation history on `/profile`

## 8. If things break

- `ContractFunctionExecutionError` / read revert:
  - Usually wrong address, wrong network, or contracts not deployed.
- Wallet connected but app redirects oddly:
  - Ensure wallet is on `31337` and contracts are deployed.
- Local chain reset after restart:
  - Re-run both deploy commands in Step 3.
