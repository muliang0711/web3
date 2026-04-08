# Web3 Application Data Flow Explanation

This document explains the data flow of the decentralized application (dApp). It covers what happens when a user executes an action on the frontend, how the data travels, and exactly where it is saved.

## 1. High-Level Data Flow Architecture

Unlike a traditional "Web2" application where data is saved in a centralized database (like PostgreSQL or MongoDB) managed by a backend server (like Node.js or Python), this application creates a direct link between the user's wallet and the blockchain.

**The Flow:**
1. **Frontend (React)**: User clicks a button (e.g., "Register" or "Create Campaign").
2. **Wallet (MetaMask)**: The frontend asks the user's wallet to sign and approve the transaction. You must pay a small gas fee in ETH to modify data.
3. **RPC Node**: The signed transaction is sent to a blockchain node (e.g., your local Hardhat node running on `http://127.0.0.1:8545`).
4. **Smart Contract**: The node executes the requested function in the specific smart contract deployed on the blockchain.
5. **Blockchain State**: If successful, the smart contract updates its internal "State Variables". This data is permanently saved on the blockchain.

---

## 2. Where is the data saved exactly?

Data is saved in **State Variables** inside the deployed Smart Contracts on the Ethereum (or local Hardhat) blockchain.

There are three main contracts in this project. Here is a breakdown of what each contract saves when you execute specific actions:

### A. UserRegistry (`UserRegistry.sol`)
This contract serves as the central database of all users and their global donation history.

* **Action:** User executes `register(name)`
  * **Saved Where:** The `mapping(address => User) public users` state variable.
  * **What:** It maps your wallet address to your `User` profile (containing `name` and `isRegistered`).
  
* **Action:** User donates to a campaign (Triggered automatically by the Campaign contract)
  * **Saved Where:** The `mapping(address => DonationRecord[]) public userDonations` state variable.
  * **What:** It pushes a new `DonationRecord` (with campaign address, amount, and timestamp) into your wallet's history array.

### B. CampaignFactory (`CampaignFactory.sol`)
This contract is responsible for creating new campaigns and tracking them.

* **Action:** User executes `createCampaign(title, description, target, duration)`
  * **Saved Where 1:** The `address[] public campaigns` array state variable.
  * **Saved Where 2:** The `mapping(address => address[]) public userCampaigns` state variable.
  * **What:** The factory deploys a brand new `Campaign` contract to the blockchain. The new contract's unique address is saved in these arrays so we know it exists.

### C. Campaign (`Campaign.sol`)
Every time a campaign is created, a *new* copy of this contract is deployed to the blockchain. Each campaign contract manages its own specific data.

* **Action:** User creates the campaign
  * **Saved Where:** In the state variables of this *specific* new Campaign contract (`creator`, `title`, `description`, `fundingTarget`, `deadline`).
  
* **Action:** User executes `contribute()` (sending ETH)
  * **Saved Where 1:** The ETH is held in the physical balance of this Campaign contract address.
  * **Saved Where 2:** The `mapping(address => uint256) public contributions` state variable updates your wallet's internal contribution total to this campaign.
  * **Saved Where 3:** The `address[] public contributors` array saves your wallet address if it's your first time donating here.
  * **Saved Where 4:** The `uint256 public totalFunded` increases.
  
* **Action:** User executes `withdrawFunds()` or `refund()`
  * **Saved Where:** The boolean flags `fundsWithdrawn` or `contributions[msg.sender]` drop to 0. 
  * **What:** The Ethereum blockchain securely transfers the physical ETH balances back to the wallets.

* **Action:** User executes `refund()` or the creator executes `refundAll()`
  * **Saved Where 1:** The `mapping(address => uint256) public claimableRewards` in `UserRegistry`.
  * **Saved Where 2:** The CFR token balance in `RewardToken`, when already-claimed rewards must be reversed.
  * **What:** Refunds now reverse the reward value linked to the refunded donation. If the reward was not claimed yet, the user's claimable reward balance is reduced. If it was already claimed, the matching CFR amount is burned.

---

## 3. How does the Frontend read the data?

When you open a page (e.g., the Dashboard or a Campaign page):
1. **Wagmi/ViEM Hooks**: The React frontend (using hooks like `useReadContract` in `useUserRegistry.ts` or `useCampaign.ts`) makes a "call" to the blockchain.
2. **Read-Only**: Because reading data doesn't change the blockchain state, you don't need a wallet signature and it costs no gas.
3. **Display**: The blockchain instantly returns the requested state variables (like the `User` struct or the `campaigns` array), and React renders it on the screen.

### Important: How Data is Handled on the Frontend
It is crucial to understand that **the React frontend does not physically "save" or store the arrays of users or campaigns**. 

Instead of keeping a local database (like Redux, LocalStorage, or a backend database), the frontend uses tools like **Wagmi** and **React Query**:
1. **Smart Contract is the Database:** The actual list of campaigns (`address[] public campaigns`) is strictly saved inside the smart contract on the blockchain.
2. **Real-time Fetching:** In `useCampaignFactory.ts`, the frontend calls `useReadContract({ functionName: 'getCampaigns' })`. This reaches out to the blockchain and *downloads* the latest array memory.
3. **In-Memory Cache:** Wagmi temporarily holds this downloaded array in the app's computer memory (RAM) just so the React components can map over it and display the UI.
4. **Auto-Refetch:** If you refresh the page or execute a new transaction, Wagmi throws away the old memory cache and fetches the fresh array directly from the blockchain again.

This ensures the frontend is always completely synchronized with the permanent and immutable blockchain state.
