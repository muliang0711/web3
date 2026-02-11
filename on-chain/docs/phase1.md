# 文档一：AI Agent 执行指南

## Ethereum Crowdfunding Platform - Smart Contract Development Specification

### 📋 Project Overview
Develop a **Decentralized Crowdfunding Platform** with integrated **Event Scanner** capabilities using Ethereum and Solidity. This document provides complete implementation instructions for AI code generation agents.

---

## 🎯 Core Requirements

### Platform Specifications
- **Blockchain**: Ethereum Testnet (Sepolia/Goerli) or Hardhat Local Network
- **Language**: Solidity ^0.8.0
- **Token Standard**: ERC-20 for reward distribution
- **Integration**: Must support Web3.js/Ethers.js providers
- **Event Emission**: All state changes MUST emit indexed events

---

## 📐 Smart Contract Architecture

### Contract 1: CrowdfundingPlatform.sol

#### State Variables
```solidity
uint256 public campaignCount;
mapping(uint256 => Campaign) public campaigns;
mapping(uint256 => mapping(address => uint256)) public contributions;
mapping(uint256 => mapping(address => uint256)) public refunds;

struct Campaign {
    address creator;
    string title;
    string description;
    uint256 goal;
    uint256 deadline;
    uint256 totalRaised;
    uint8 status; // 0=Active, 1=Success, 2=Failed, 3=Cancelled
    bool fundsWithdrawn;
}
```

#### Function 1: createCampaign
```solidity
function createCampaign(
    string memory _title,
    string memory _description,
    uint256 _goal,
    uint256 _durationInDays
) external returns (uint256)
```

**Business Logic:**
1. Increment `campaignCount`
2. Calculate `deadline = block.timestamp + (_durationInDays * 1 days)`
3. Require `_goal > 0` and `_durationInDays > 0`
4. Initialize campaign with `status = 0` (Active)
5. **MUST EMIT:**
```solidity
emit CampaignCreated(
    campaignCount,
    msg.sender,
    _title,
    _goal,
    deadline,
    block.timestamp
);
```

---

#### Function 2: contribute
```solidity
function contribute(uint256 _projectId) external payable
```

**Business Logic:**
1. Require campaign exists (`_projectId <= campaignCount`)
2. Require campaign is active (`status == 0`)
3. Require deadline not passed (`block.timestamp < deadline`)
4. Require `msg.value > 0`
5. Update `contributions[_projectId][msg.sender] += msg.value`
6. Update `campaigns[_projectId].totalRaised += msg.value`
7. **Check if goal reached:**
   - If `totalRaised >= goal`, emit `CampaignStatusChanged` with `newStatus = 1`
8. **MUST EMIT:**
```solidity
emit ContributionReceived(
    _projectId,
    msg.sender,
    msg.value,
    block.timestamp
);
```

---

#### Function 3: withdrawFunds
```solidity
function withdrawFunds(uint256 _projectId) external
```

**Business Logic:**
1. Require `msg.sender == campaigns[_projectId].creator`
2. Require campaign successful (`status == 1` OR `totalRaised >= goal`)
3. Require funds not already withdrawn (`!fundsWithdrawn`)
4. Set `fundsWithdrawn = true`
5. Transfer `totalRaised` to creator using `payable(msg.sender).transfer(amount)`
6. **MUST EMIT:**
```solidity
emit FundsWithdrawn(
    _projectId,
    msg.sender,
    amount,
    block.timestamp
);
```

---

#### Function 4: claimRefund
```solidity
function claimRefund(uint256 _projectId) external
```

**Business Logic:**
1. Require campaign failed (`block.timestamp > deadline` AND `totalRaised < goal`)
2. Update status to Failed (2) if not already
3. Require contributor has balance (`contributions[_projectId][msg.sender] > 0`)
4. Calculate refund amount
5. Set contribution to 0 (prevent re-entrancy)
6. Transfer refund using **Pull Payment pattern**
7. **MUST EMIT:**
```solidity
emit RefundClaimed(
    _projectId,
    msg.sender,
    refundAmount,
    block.timestamp
);
```

---

#### Function 5: checkAndUpdateStatus
```solidity
function checkAndUpdateStatus(uint256 _projectId) public
```

**Business Logic:**
1. If `block.timestamp > deadline` and `totalRaised < goal`:
   - Set `status = 2` (Failed)
   - Emit `CampaignStatusChanged`
2. If `totalRaised >= goal`:
   - Set `status = 1` (Success)
   - Emit `CampaignStatusChanged`

---

### Contract 2: RewardToken.sol (ERC-20)

#### Inherit from OpenZeppelin
```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
```

#### Custom Function: distributeRewards
```solidity
function distributeRewards(address _to, uint256 _projectId, uint256 _amount) external onlyPlatform
```

**Business Logic:**
1. Mint tokens using `_mint(_to, _amount)`
2. **MUST EMIT Standard ERC-20 Transfer:**
```solidity
emit Transfer(address(0), _to, _amount);
```
3. **MUST EMIT Custom Event:**
```solidity
emit RewardAllocated(_projectId, _to, _amount);
```

---

## 🔔 Complete Event Definitions

### CRITICAL: All events MUST use `indexed` for filtering capabilities

```solidity
// Campaign Lifecycle
event CampaignCreated(
    uint256 indexed projectId,
    address indexed creator,
    string title,
    uint256 goal,
    uint256 deadline,
    uint256 timestamp
);

event CampaignStatusChanged(
    uint256 indexed projectId,
    uint8 indexed newStatus,
    uint256 timestamp
);

// Financial Transactions
event ContributionReceived(
    uint256 indexed projectId,
    address indexed contributor,
    uint256 amount,
    uint256 timestamp
);

event FundsWithdrawn(
    uint256 indexed projectId,
    address indexed creator,
    uint256 amount,
    uint256 timestamp
);

event RefundClaimed(
    uint256 indexed projectId,
    address indexed contributor,
    uint256 amount,
    uint256 timestamp
);

// ERC-20 Rewards
event Transfer(
    address indexed from,
    address indexed to,
    uint256 value
);

event RewardAllocated(
    uint256 indexed projectId,
    address indexed recipient,
    uint256 tokenAmount
);
```

---

## ⚙️ Gas Optimization Requirements

### 1. Use Pull Payment Pattern
- **DO NOT** loop through contributors for refunds
- Store refund amounts in mapping
- Let users claim their own refunds

### 2. Avoid Redundant Storage Writes
- Check conditions before updating state
- Use memory variables for calculations

### 3. Efficient Data Types
- Use `uint8` for status (saves gas vs uint256)
- Pack variables in same storage slot where possible

---

## 🧪 Testing Script Requirements

Create `scripts/testEvents.js` with:

```javascript
async function main() {
    // Deploy contracts
    const platform = await deploy("CrowdfundingPlatform");
    
    // Test Case 1: Create 5 campaigns
    for(let i = 0; i < 5; i++) {
        await platform.createCampaign(
            `Campaign ${i}`,
            "Description",
            ethers.utils.parseEther("10"),
            30
        );
    }
    
    // Test Case 2: Generate 20 contributions
    for(let i = 1; i <= 5; i++) {
        for(let j = 0; j < 4; j++) {
            await platform.contribute(i, {
                value: ethers.utils.parseEther("2")
            });
        }
    }
    
    // Test Case 3: Trigger status changes
    await platform.checkAndUpdateStatus(1);
}
```

---

## 📦 Deliverables Checklist

- [ ] `CrowdfundingPlatform.sol` with all 5 functions
- [ ] `RewardToken.sol` inheriting ERC20
- [ ] All 7 events properly emitted with indexed parameters
- [ ] Deployment script for testnet
- [ ] Test script generating 50+ events
- [ ] ABI export in JSON format
- [ ] Contract address documentation
- [ ] README with:
  - [ ] Deployment instructions
  - [ ] Function call examples
  - [ ] Event signature list (Topic 0 hashes)

---

## 🚨 Mandatory Validations

### Before Submission:
1. **Compile without warnings** using `solc ^0.8.0`
2. **Verify event emissions** using Hardhat console logs
3. **Test on testnet** and record transaction hashes
4. **Export ABI** - Event Scanner needs exact event signatures
5. **Check indexed parameters** - Must have at least 2 indexed fields per event

---

## 📊 Event Scanner Integration Points

The backend will need:
- **Contract Address**: `0x...`
- **ABI JSON**: Full interface definition
- **Event Signatures**: 
  ```
  CampaignCreated: 0x1234... (Topic 0)
  ContributionReceived: 0x5678...
  ```
- **Starting Block**: Block number when contract was deployed

---

## ⚠️ Common Pitfalls to Avoid

1. **Missing timestamp in events** - Scanner needs temporal ordering
2. **Not using indexed** - Filtering will be impossible
3. **Using loops for refunds** - Will hit gas limits
4. **Forgetting to update status** - Business logic will break
5. **Hardcoding addresses** - Use constructor parameters
6. **Not handling re-entrancy** - Use Checks-Effects-Interactions pattern

---

## 🎓 Success Criteria

Your smart contract is complete when:
- ✅ 100+ events can be generated in < 5 minutes
- ✅ All events contain `timestamp` field
- ✅ Gas cost per contribution < 100k gas
- ✅ Refunds work without looping
- ✅ ERC-20 Transfer events are standard-compliant
- ✅ ABI can be imported into Ethers.js without errors

---

**END OF SPECIFICATION**

---