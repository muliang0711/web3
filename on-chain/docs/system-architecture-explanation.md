# System Architecture Explanation

This document explains each component that appears in the system architecture diagram.

## 1. User

The user is the person interacting with the application. In this project, the user can connect a wallet, register a profile, create a campaign, donate to a campaign, request a refund when allowed, and claim reward tokens. The user is the starting point of all major application actions.

## 2. Frontend Layer

The frontend layer is the main application interface seen by the user. It is responsible for presenting pages, collecting user input, showing campaign data, and triggering blockchain or database actions. In this project, the frontend layer contains the React client together with the supporting libraries that connect it to blockchain and Supabase services.

## 3. React + TypeScript + Vite Client

This is the main web application. It handles the visible user interface, including the landing page, login and registration pages, dashboard, profile page, campaign pages, report pages, donation flow, refund flow, and reward claim flow. Its job is to make the blockchain-based system easier for users to use through a structured web interface.

## 4. Wagmi + Viem

Wagmi and Viem act as the blockchain interaction layer inside the frontend. They are responsible for connecting the frontend to the wallet and to the smart contracts. They perform contract reads, submit contract writes, track transaction confirmations, and help the UI stay synchronized with blockchain state.

## 5. Supabase Client

The Supabase client is the frontend-side connection to the off-chain backend. It is used to read and write user rows, campaign metadata, donation history, refund history, and uploaded image references. In simple terms, it helps the app store and retrieve off-chain information that is not ideal to keep directly on the blockchain.

## 6. Wallet Layer

The wallet layer represents MetaMask or another EVM-compatible wallet. Its main purpose is to manage blockchain accounts and sign transactions requested by the frontend. Whenever a user performs a blockchain action such as registration, campaign creation, donation, refund, withdrawal, or reward claim, the wallet must approve and sign that transaction.

## 7. Blockchain Layer

The blockchain layer is the execution environment for all smart-contract logic. It processes signed transactions, updates contract state, stores permanent on-chain data, and emits logs and receipts that can later be read by the frontend. In this project, the blockchain layer is represented by the local Hardhat development chain.

## 8. Hardhat Local Node / EVM RPC

The Hardhat node is the local blockchain network used during development. It provides the RPC endpoint that the frontend and tooling connect to. Its role is to receive contract read and write requests, execute smart-contract functions, produce transaction receipts, and simulate a real EVM blockchain in a local environment.

## 9. Smart Contracts

The smart contracts are the core business-logic layer of the application. They enforce the rules for user registration, campaign creation, donation handling, refunds, withdrawals, and rewards. In this project, the smart-contract group contains five contracts:

- `CampaignFactory`, which deploys and tracks campaigns
- `Campaign`, which manages one individual campaign
- `UserRegistry`, which stores users and reward-related donation data
- `RewardManager`, which manages reward claiming and reward reversal
- `RewardToken`, which represents the CFR token

## 10. Supabase Backend

The Supabase backend is the off-chain storage and support system for the application. It contains database tables such as `users`, `campaigns`, `donations`, and `refunds`, together with the `app-media` storage bucket for uploaded images. Its main role is to support application usability by storing metadata, images, and history records that complement the blockchain state.

## 11. How The Components Work Together

The overall system flow is straightforward. The user interacts with the React frontend. The frontend uses Wagmi and Viem to connect to the wallet and to call the blockchain through the Hardhat node. The wallet signs sensitive blockchain transactions. The blockchain then executes the smart contracts and returns receipts or updated state. At the same time, the frontend uses the Supabase client to read and write supporting off-chain data into the Supabase backend. Because of this structure, the system combines on-chain trust and rule enforcement with off-chain usability and data convenience.
