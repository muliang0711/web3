# User Module Assignment Reflection

## Please briefly describe the module(s)/function(s) you engaged in the assignment.

For this assignment, I focused on the **user module** in the frontend application. The main parts I engaged with were:

- `LoginView` in [client/src/views/hy/Login.tsx](C:/Code/project/web3/client/src/views/hy/Login.tsx), which handles wallet connection, wallet reset, and user redirection based on registration state.
- `RegisterView` in [client/src/views/hy/Register.tsx](C:/Code/project/web3/client/src/views/hy/Register.tsx), which allows a connected wallet user to register a profile name through the `register()` smart contract function.
- `DashboardView` in [client/src/views/hy/Dashboard.tsx](C:/Code/project/web3/client/src/views/hy/Dashboard.tsx), which displays user summary data such as total donations, number of campaigns created, and recent activity.
- `ProfileView` in [client/src/views/hy/Profile.tsx](C:/Code/project/web3/client/src/views/hy/Profile.tsx), which shows the user profile, donation history, refund history, claimable rewards, and profile image upload.
- `GlobalHistoryView` in [client/src/views/hy/GlobalHistory.tsx](C:/Code/project/web3/client/src/views/hy/GlobalHistory.tsx), which displays all registered users with registration time derived from blockchain event logs.
- `UserCreatedHistoryView` in [client/src/views/hy/UserCreatedHistory.tsx](C:/Code/project/web3/client/src/views/hy/UserCreatedHistory.tsx), which lets a user review campaigns they created and perform owner actions such as refunding all contributors or withdrawing funds.

I also engaged with the supporting user-related logic:

- `useUserRegistry()` in [client/src/hooks/useUserRegistry.ts](C:/Code/project/web3/client/src/hooks/useUserRegistry.ts), which reads user data from blockchain and Supabase, performs registration, uploads profile images, and refreshes user state.
- `useRefundHistory()` in [client/src/hooks/useRefundHistory.ts](C:/Code/project/web3/client/src/hooks/useRefundHistory.ts), which loads refund history for the connected user and enriches it with campaign titles and on-chain timestamps.
- `Web3Gate` in [client/src/components/guards/Web3Gate.tsx](C:/Code/project/web3/client/src/components/guards/Web3Gate.tsx), which protects routes and redirects users depending on wallet connection and registration status.
- `fetchRegistrationTimestampForAddress()` and `fetchRegistrationTimestampsForAddresses()` in [client/src/lib/userRegistration.ts](C:/Code/project/web3/client/src/lib/userRegistration.ts), which read `UserRegistered` event logs to get accurate on-chain registration times.

## What are the strengths of the modules/functions created by you?

The main strength of the user module is that it combines **blockchain state** and **Supabase data** in a practical way. The blockchain is used for critical and trusted data such as registration status and claimable rewards, while Supabase is used for metadata such as profile images, names, and history tables. This makes the module more usable for a real application while still preserving Web3 behavior.

Another strength is the **clear user flow**. A user connects a wallet, is checked through `Web3Gate`, is redirected to register if necessary, and can then access the dashboard and profile. This creates a smooth flow from login to profile usage.

The module also has good **route protection and state handling**. `Web3Gate` prevents unregistered or disconnected users from reaching protected pages. At the same time, `useUserRegistry()` centralizes the user-loading logic, which reduces duplication and makes the pages easier to maintain.

The profile-related features are also a strength. `ProfileView` does not only show static information; it supports reward claiming, donation history, refund history, and profile image upload. This makes the user module more complete and useful from a user perspective.

Finally, using on-chain event logs for registration timestamps improves **data accuracy**, because the displayed registration time reflects the actual blockchain event rather than only the database insertion time.

## What are the weaknesses of the modules/functions created by you?

One weakness is that the user module still depends heavily on the frontend for orchestration. For example, registration, donation history display, refund history display, and profile updates are coordinated in the client layer. This means the frontend has a lot of responsibility, and the logic can become harder to maintain as the project grows.

Another weakness is the **mixed dependency on blockchain and Supabase**. While this is also a strength, it creates synchronization risk. If a blockchain transaction succeeds but a Supabase insert or update fails, the user interface may temporarily show incomplete or inconsistent data.

There is also some **type-safety weakness** in the module. Several places use `any` for records such as donation rows, refund rows, and registration rows. This makes development faster, but it increases the chance of mistakes and reduces code clarity.

Performance is another possible weakness. Functions such as registration timestamp loading rely on scanning logs from block `0` to `latest`. This is acceptable in a local or small project, but it may become inefficient when deployed on a larger network with more data.

In addition, some user-facing logic is still fairly simple. Error handling exists, but the recovery experience can still be improved. For example, failure states are usually shown as messages, but there is not always a detailed retry or troubleshooting path for the user.

## What have you learned in doing this assignment?

I learned how to design a user module that works in a **hybrid Web3 architecture**. In this assignment, the user module is not purely blockchain-based and not purely database-based. Instead, it uses blockchain for ownership, registration validity, and rewards, while Supabase supports convenient application features such as history tables and media storage.

I also learned how important **state synchronization** is in decentralized applications. It is not enough to only submit blockchain transactions. The frontend also needs to wait for confirmations, refresh data, and update supporting services such as Supabase so that the user sees the correct result.

Another important lesson is the role of **route guarding and flow control**. A Web3 app needs to consider more than just whether a user is logged in. It must also check whether the wallet is connected, whether the wallet is registered, and whether the application has finished resolving asynchronous state before deciding which page to show.

I also learned that user experience in Web3 applications needs extra care. Wallet connection, transaction confirmation, and chain-based loading all introduce delay and uncertainty, so the interface must guide the user clearly through these steps.

## What are the challenges, if any, faced by you while working on this assignment?

One challenge was handling the interaction between **wallet connection, on-chain reads, and frontend redirection**. The module needed to decide correctly whether to send the user to login, registration, or dashboard without causing incorrect redirects while data was still loading.

Another challenge was ensuring that user data remained meaningful even when it came from multiple sources. Blockchain data and Supabase data do not always arrive at the same time, so I had to think about fallback behavior and how to avoid breaking the user experience when one source is slower or temporarily unavailable.

I also faced challenges in working with **transaction-based workflows**. In Web3, registration and reward claiming are not immediate actions. They require wallet confirmation, transaction mining, and post-transaction synchronization. This makes the implementation more complex than a normal Web2 form submission.

Another challenge was handling **history and timestamp accuracy**. Database timestamps are easy to query, but they do not always represent the actual blockchain event time. To improve accuracy, I used event-log-based timestamp fetching, but this introduced more complexity and potential performance cost.

Overall, the main challenge in the user module was balancing **correctness, usability, and integration complexity** across React, Wagmi, smart contracts, and Supabase.
