# Module Challenges And Limitations

This document explains the main challenges and limitations of the project by module. The project can be understood through five main modules: user, campaign, donation and refund, reward, and data or integration.

## 1. User Module

The user module covers wallet connection, registration, and profile handling. Its main limitation is that registration is mostly enforced by the frontend, not completely by the smart contracts. This means the normal application flow requires a user to register before accessing protected pages, but a user interacting directly with the smart contracts could bypass some frontend-only restrictions. Another limitation is that the profile system is still simple. It supports registration, wallet recognition, and profile images, but it does not yet include stronger account management features such as role-based access control, identity verification, or advanced authentication logic.

## 2. Campaign Module

The campaign module handles campaign creation, campaign tracking, targets, deadlines, and withdrawals. Its core on-chain logic is strong, but the module is still limited in flexibility. Once a campaign is created, the main information cannot be edited, and there is no campaign deletion or moderation workflow. In addition, each campaign is deployed as a separate smart contract, which is useful for separation of state but adds deployment and management complexity. Because of this, the campaign module is appropriate for a prototype or academic system, but it is not yet a fully mature production campaign-management platform.

## 3. Donation And Refund Module

The donation and refund module controls ETH contributions, refund processing, and failed-campaign settlement. Its main challenge is scalability. The `refundAll()` logic processes contributor refunds through a loop in one transaction, which is manageable for small campaigns but can become expensive if a campaign has many contributors. Another limitation is the normal operational friction of Web3 systems. Donations, refunds, and withdrawals depend on wallet confirmation, gas fees, and transaction timing, so even correct business logic can still produce a slower or more fragile user experience compared with a traditional centralized system.

## 4. Reward Module

The reward module manages claimable rewards and the CFR token. Its purpose is to reward donations using a simple `1 ETH : 1 CFR` rule. The previous mismatch between refunds and rewards has been fixed, because refunds now reverse reward value on-chain and burn already-claimed tokens when required. However, the module still has a practical limitation: if a user has already claimed CFR and does not hold enough token balance anymore, the refund reversal cannot burn the required amount, so the refund transaction will fail until the balance becomes sufficient again. This keeps accounting correct, but it introduces dependency between refunds and current token holdings.

## 5. Data And Integration Module

The data and integration module includes Supabase, storage, reporting support, and synchronization between off-chain and on-chain information. Its main challenge is consistency. Critical state such as campaigns, funding, and rewards exists on-chain, but supporting information such as images, history rows, and metadata is stored in Supabase. Because of this split, temporary mismatches can happen if syncing fails or if an action occurs directly on-chain without going through the frontend flow. Another limitation is that the current backend setup is optimized for development convenience, not full production security. The project is mainly configured for a local Hardhat network, and Supabase access is still more open than what would normally be used in a hardened production deployment.

## 6. Overall Observation

Across all modules, the main project challenge is balancing decentralization, usability, and simplicity. The system already demonstrates a complete Web3 application flow with wallet interaction, smart contracts, token rewards, refunds, and supporting database services. At the same time, each module still shows prototype-level limitations. For that reason, the project is best described as a functional academic prototype rather than a finished commercial platform.
