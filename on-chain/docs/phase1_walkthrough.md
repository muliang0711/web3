# Phase 1 Walkthrough: Ethereum Crowdfunding Platform

## Overview
Phase 1 implements the on-chain smart contracts for a decentralized crowdfunding platform with integrated event scanning capabilities.

---

## Contracts

### CrowdfundingPlatform.sol
Main platform contract managing campaign lifecycle.

**State Variables:**
- `campaignCount` — auto-incrementing campaign ID counter
- `campaigns` — mapping of campaign ID → Campaign struct
- `contributions` — nested mapping tracking each contributor's balance per campaign
- `refunds` — nested mapping tracking refunds claimed

**Functions:**
| Function | Access | Description |
|---|---|---|
| `createCampaign(title, description, goal, durationInDays)` | External | Create a new campaign, returns campaign ID |
| `contribute(projectId)` | External payable | Contribute ETH to a campaign |
| `withdrawFunds(projectId)` | External | Creator withdraws funds from successful campaign |
| `claimRefund(projectId)` | External | Contributor claims refund from failed campaign |
| `checkAndUpdateStatus(projectId)` | Public | Update campaign status based on deadline/goal |
| `getCampaign(projectId)` | View | Get full campaign details |
| `getContribution(projectId, contributor)` | View | Get specific contribution amount |

### RewardToken.sol
ERC-20 reward token for contributor incentives.

**Functions:**
| Function | Access | Description |
|---|---|---|
| `distributeRewards(to, projectId, amount)` | External (onlyPlatform) | Mint reward tokens to a contributor |
| `updatePlatform(newPlatform)` | External (onlyPlatform) | Update the platform address |

---

## Events

All events use `indexed` parameters for efficient filtering.

```
CampaignCreated(uint256 indexed projectId, address indexed creator, string title, uint256 goal, uint256 deadline, uint256 timestamp)
CampaignStatusChanged(uint256 indexed projectId, uint8 indexed newStatus, uint256 timestamp)
ContributionReceived(uint256 indexed projectId, address indexed contributor, uint256 amount, uint256 timestamp)
FundsWithdrawn(uint256 indexed projectId, address indexed creator, uint256 amount, uint256 timestamp)
RefundClaimed(uint256 indexed projectId, address indexed contributor, uint256 amount, uint256 timestamp)
RewardAllocated(uint256 indexed projectId, address indexed recipient, uint256 tokenAmount)
```

---

## Deployment

### Local (Hardhat)
```bash
npx hardhat compile
npx hardhat run scripts/testEvents.ts
```

### Ignition Module
```bash
npx hardhat ignition deploy ignition/modules/CrowdfundingPlatform.ts
```

### Sepolia Testnet
### Sepolia Testnet
Set environment variables in `.env` file:
```bash
cp .env.example .env
# Edit .env and set your SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY
```

Deploy:
```bash
npx hardhat ignition deploy ignition/modules/CrowdfundingPlatform.ts --network sepolia
```

---

## Function Call Examples

### Create a Campaign
```typescript
await platform.write.createCampaign([
  "Solar Panel Fund",
  "Community solar project",
  parseEther("10"),   // 10 ETH goal
  BigInt(30)          // 30 days duration
]);
```

### Contribute to a Campaign
```typescript
await platform.write.contribute([BigInt(1)], {
  value: parseEther("2")
});
```

### Withdraw Funds (Creator)
```typescript
await platform.write.withdrawFunds([BigInt(1)]);
```

### Claim Refund (Contributor)
```typescript
await platform.write.claimRefund([BigInt(1)]);
```

### Distribute Rewards
```typescript
await rewardToken.write.distributeRewards([
  contributorAddress,
  BigInt(1),           // projectId
  parseEther("100")    // 100 CFRD tokens
]);
```

---

## ABI Files
Generated at:
- `artifacts/contracts/CrowdfundingPlatform.sol/CrowdfundingPlatform.json`
- `artifacts/contracts/RewardToken.sol/RewardToken.json`

---

## Test Results

**23/23 tests passing:**

| Suite | Tests | Result |
|---|---|---|
| createCampaign | 5 | ✅ All pass |
| contribute | 6 | ✅ All pass |
| withdrawFunds | 4 | ✅ All pass |
| checkAndUpdateStatus | 2 | ✅ All pass |
| RewardToken | 3 | ✅ All pass |
| Multiple Campaigns | 1 | ✅ All pass |
| Project (existing) | 2 | ✅ All pass |

Run tests:
```bash
npx hardhat test
```

---

## Security Patterns Used
- **Checks-Effects-Interactions** — state updated before external calls
- **Pull Payment** — contributors claim their own refunds (no loops)
- **Gas-efficient types** — `uint8` for campaign status
- **Access control** — `onlyPlatform` modifier on RewardToken

---

## Event Scanner Integration

The backend needs:
- **Contract Address**: from deployment output
- **ABI JSON**: from `artifacts/` folder
- **Starting Block**: block number at deployment

---

## Files Created

| File | Description |
|---|---|
| `contracts/CrowdfundingPlatform.sol` | Main crowdfunding contract |
| `contracts/RewardToken.sol` | ERC-20 reward token |
| `ignition/modules/CrowdfundingPlatform.ts` | Hardhat Ignition deployment |
| `scripts/testEvents.ts` | Script generating 50+ events |
| `test/CrowdfundingPlatform.ts` | 21-test comprehensive suite |
