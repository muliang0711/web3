# Campaign Module – Factory Pattern Implementation

Build the campaign module for the decentralized crowdfunding dApp using the **factory pattern**: a `CampaignFactory` deploys individual `Campaign` contracts, and a `RewardToken` (ERC-20) distributes rewards to contributors on successful campaigns.

## Proposed Changes

### Smart Contracts

---

#### [NEW] [Campaign.sol](file:///c:/Code/project/web3/on-chain/contracts/Campaign.sol)

Individual campaign contract deployed by the factory. Each campaign is its own contract instance.

**State variables:**
- `creator` – address of the campaign owner
- `title`, `description` – campaign metadata
- `fundingTarget` – ETH goal (in wei)
- `deadline` – block timestamp when campaign ends
- `totalFunded` – running total of contributions
- `contributions` mapping – tracks each contributor's amount
- `contributors` array – list of contributor addresses
- `goalReached` / `fundsWithdrawn` / `isCancelled` – status flags

**Functions:**
| Function | Description |
|---|---|
| `contribute()` | `payable` – contribute ETH; must be before deadline, campaign active |
| `withdrawFunds()` | Creator-only – withdraw if target met and deadline passed |
| `refund()` | Contributor-only – get refund if deadline passed and target NOT met |
| `getCampaignInfo()` | View – returns all campaign metadata + status |
| `getContribution(addr)` | View – returns contribution amount for an address |
| `getContributors()` | View – returns array of contributor addresses |

**Events:** `ContributionMade`, `FundsWithdrawn`, `RefundIssued`

---

#### [NEW] [CampaignFactory.sol](file:///c:/Code/project/web3/on-chain/contracts/CampaignFactory.sol)

Factory contract that deploys and tracks `Campaign` instances.

**State variables:**
- `campaigns` – array of deployed Campaign addresses
- `userCampaigns` mapping – maps creator address → their campaign addresses

**Functions:**
| Function | Description |
|---|---|
| `createCampaign(title, description, fundingTarget, durationInDays)` | Deploys a new `Campaign` contract, stores its address |
| `getCampaigns()` | View – returns all campaign addresses |
| `getUserCampaigns(addr)` | View – returns campaigns created by an address |
| `getCampaignCount()` | View – returns total campaign count |

**Events:** `CampaignCreated(address campaignAddress, address creator, string title)`

---

#### [NEW] [RewardToken.sol](file:///c:/Code/project/web3/on-chain/contracts/RewardToken.sol)

ERC-20 reward token using OpenZeppelin. Minted by the campaign creator to reward contributors upon a successful campaign.

**Approach:** Simple ERC-20 with an `owner`-only `mint` function. The campaign creator receives ownership at deployment and can mint tokens to contributors (rule: **1 token per 1 ETH contributed**). Kept separate from Campaign for simplicity and clarity.

**Inherits:** `ERC20`, `Ownable` from `@openzeppelin/contracts`

---

### Deployment

#### [NEW] [CampaignFactory.ts](file:///c:/Code/project/web3/on-chain/ignition/modules/CampaignFactory.ts)

Hardhat Ignition module that deploys `CampaignFactory` (and optionally `RewardToken`).

---

### Tests

#### [NEW] [Campaign.ts](file:///c:/Code/project/web3/on-chain/test/Campaign.ts)

Comprehensive test file following the existing pattern (`node:test` + `node:assert/strict` + Hardhat 3 viem).

**Test cases:**

1. **Campaign creation via factory** – factory deploys a campaign, metadata matches
2. **Factory tracking** – `getCampaigns()` and `getUserCampaigns()` return correct data
3. **Contributing** – contribute ETH, verify balance + contribution tracking
4. **Multiple contributors** – several wallets fund, totals correct
5. **Contribute after deadline** – should revert
6. **Withdraw by creator** – target met + deadline passed → creator can withdraw
7. **Withdraw fails if target not met** – should revert
8. **Withdraw by non-creator** – should revert
9. **Refund** – target not met + deadline passed → contributor gets ETH back
10. **Refund fails if target met** – should revert
11. **RewardToken** – deploy token, mint to contributor, verify balances

## Verification Plan

### Automated Tests

Run from the `on-chain` directory:

```bash
npx hardhat test test/Campaign.ts
```

This will:
- Spin up a local Hardhat EDR network (in-process)
- Deploy contracts fresh for each test
- Use `network.provider.send("evm_increaseTime", ...)` to simulate time passing deadlines
- Assert all contribution, withdrawal, refund, and reward token flows

All 11 test cases must pass. The existing [UserRegistry.ts](file:///c:/Code/project/web3/on-chain/test/UserRegistry.ts) tests should remain unaffected.
