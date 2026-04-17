import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './providers/Web3Provider';
import { MainLayout } from './components/layout/MainLayout';
import { Web3Gate } from './components/guards/Web3Gate';
import { LandingPage } from './views/marketing/LandingPage';

// hy - User module
import { LoginView } from './views/hy/Login';
import { RegisterView } from './views/hy/Register';
import { ProfileView } from './views/hy/Profile';
import { UserCreatedHistoryView } from './views/hy/UserCreatedHistory';
import { GlobalHistoryView } from './views/hy/GlobalHistory';

// cy - Campaign module
import { CampaignsView } from './views/cy/Campaigns';
import { CampaignDetailView } from './views/cy/CampaignDetail';
import { CreateCampaignView } from './views/cy/CreateCampaign';
import { DonationSuccessView } from './views/cy/DonationSuccess';
import { CampaignReportView } from './views/cy/CampaignReport';
import { RefundSuccessView } from './views/cy/RefundSuccess';


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
            <Route path="/" element={<LandingPage />} />

            {/* The Gate wraps all routes to enforce state-based redirection */}
            <Route element={<Web3Gate />}>
              {/* hy - User module */}
              <Route path="/login" element={<LoginView />} />
              <Route path="/register" element={<RegisterView />} />
              <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/user/created-history" element={<UserCreatedHistoryView />} />
              <Route path="/global-history" element={<GlobalHistoryView />} />

              {/* cy - Campaign module */}
              <Route path="/campaigns" element={<CampaignsView />} />
              <Route path="/campaigns/create" element={<CreateCampaignView />} />
              <Route path="/campaigns/:address" element={<CampaignDetailView />} />
              <Route path="/campaigns/:address/report" element={<CampaignReportView />} />
              <Route path="/campaigns/:address/success" element={<DonationSuccessView />} />
              <Route path="/campaigns/:address/refund-success" element={<RefundSuccessView />} />



              {/* ccy - Transaction module */}
              <Route path="/transactions/user" element={<UserTransactionsView />} />
              <Route path="/transactions/campaign" element={<CampaignTransactionsView />} />
              <Route path="/transactions/filter" element={<TransactionFilterView />} />

            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </Web3Provider>
  );
}

export default App;
