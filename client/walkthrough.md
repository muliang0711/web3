# Codebase Reorganization Walkthrough

## What Changed

Reorganized `client/src/views/` from flat files into **4 team member folders**, each containing their assigned pages. Updated the dashboard to serve as a central hub with navigation buttons to all pages.

## Final Folder Structure

```
views/
├── hy/          (User module)
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx      ← Redesigned with 11 nav buttons
│   ├── Profile.tsx
│   └── UserCreatedHistory.tsx  🚧
├── cy/          (Campaign module)
│   ├── Campaigns.tsx
│   ├── CampaignDetail.tsx
│   ├── CreateCampaign.tsx      🚧
│   └── CampaignHistory.tsx     🚧
├── nv/          (Donation module)
│   ├── DonateToCampaign.tsx    🚧
│   ├── DonationSuccess.tsx     🚧
│   └── RefundHistory.tsx       🚧
└── ccy/         (Transaction module)
    ├── UserTransactions.tsx     🚧
    ├── CampaignTransactions.tsx 🚧
    └── TransactionFilter.tsx   🚧
```

> 🚧 = placeholder page, ready for teammates to implement

## Key Changes

| File | Change |
|------|--------|
| [App.tsx](file:///c:/Code/project/web3/client/src/App.tsx) | Rewrote with 15 routes organized by module |
| [Dashboard.tsx](file:///c:/Code/project/web3/client/src/views/hy/Dashboard.tsx) | 11 nav buttons in 4 categories (User, Campaigns, Donations, Transactions) |
| [index.css](file:///c:/Code/project/web3/client/src/index.css) | Added `.nav-grid-3` for 3-column layout |

## Routes Map

| Route | Component | Module |
|-------|-----------|--------|
| `/login` | LoginView | hy |
| `/register` | RegisterView | hy |
| `/dashboard` | DashboardView | hy |
| `/profile` | ProfileView | hy |
| `/user/created-history` | UserCreatedHistoryView | hy |
| `/campaigns` | CampaignsView | cy |
| `/campaigns/create` | CreateCampaignView | cy |
| `/campaigns/history` | CampaignHistoryView | cy |
| `/campaigns/:address` | CampaignDetailView | cy |
| `/donate` | DonateToCampaignView | nv |
| `/donation-success` | DonationSuccessView | nv |
| `/refund-history` | RefundHistoryView | nv |
| `/transactions/user` | UserTransactionsView | ccy |
| `/transactions/campaign` | CampaignTransactionsView | ccy |
| `/transactions/filter` | TransactionFilterView | ccy |

## Verification

- ✅ `npx tsc --noEmit` — passed with exit code 0
- ✅ All 6 original files deleted from `views/` root
- ✅ No loose files remain in `views/` — only the 4 team folders
