import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './providers/Web3Provider';
import { MainLayout } from './components/layout/MainLayout';
import { Web3Gate } from './components/guards/Web3Gate';

// hy - User module
import { LoginView } from './views/hy/Login';
import { RegisterView } from './views/hy/Register';
import { DashboardView } from './views/hy/Dashboard';
import { ProfileView } from './views/hy/Profile';
import { UserCreatedHistoryView } from './views/hy/UserCreatedHistory';

// cy - Campaign module
import { CampaignsView } from './views/cy/Campaigns';
import { CampaignDetailView } from './views/cy/CampaignDetail';
import { CreateCampaignView } from './views/cy/CreateCampaign';
import { CampaignHistoryView } from './views/cy/CampaignHistory';

// nv - Donation module
import { DonateToCampaignView } from './views/nv/DonateToCampaign';
import { DonationSuccessView } from './views/nv/DonationSuccess';
import { RefundHistoryView } from './views/nv/RefundHistory';

// ccy - Transaction module
import { UserTransactionsView } from './views/ccy/UserTransactions';
import { CampaignTransactionsView } from './views/ccy/CampaignTransactions';
import { TransactionFilterView } from './views/ccy/TransactionFilter';

import './App.css';

function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            {/* The Gate wraps all routes to enforce state-based redirection */}
            <Route element={<Web3Gate />}>
              {/* hy - User module */}
              <Route path="/login" element={<LoginView />} />
              <Route path="/register" element={<RegisterView />} />
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/user/created-history" element={<UserCreatedHistoryView />} />

              {/* cy - Campaign module */}
              <Route path="/campaigns" element={<CampaignsView />} />
              <Route path="/campaigns/create" element={<CreateCampaignView />} />
              <Route path="/campaigns/history" element={<CampaignHistoryView />} />
              <Route path="/campaigns/:address" element={<CampaignDetailView />} />

              {/* nv - Donation module */}
              <Route path="/donate" element={<DonateToCampaignView />} />
              <Route path="/donation-success" element={<DonationSuccessView />} />
              <Route path="/refund-history" element={<RefundHistoryView />} />

              {/* ccy - Transaction module */}
              <Route path="/transactions/user" element={<UserTransactionsView />} />
              <Route path="/transactions/campaign" element={<CampaignTransactionsView />} />
              <Route path="/transactions/filter" element={<TransactionFilterView />} />

              {/* Default catch-all */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </Web3Provider>
  );
}

export default App;
