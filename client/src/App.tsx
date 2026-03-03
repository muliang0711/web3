import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Web3Provider } from './providers/Web3Provider';
import { MainLayout } from './components/layout/MainLayout';
import { Web3Gate } from './components/guards/Web3Gate';
import { LoginView } from './views/Login';
import { RegisterView } from './views/Register';
import { DashboardView } from './views/Dashboard';
import { ProfileView } from './views/Profile';
import { CampaignsView } from './views/Campaigns';
import { CampaignDetailView } from './views/CampaignDetail';
import './App.css';

function App() {
  return (
    <Web3Provider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            {/* The Gate wraps all routes to enforce state-based redirection */}
            <Route element={<Web3Gate />}>
              <Route path="/login" element={<LoginView />} />
              <Route path="/register" element={<RegisterView />} />
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/campaigns" element={<CampaignsView />} />
              <Route path="/campaigns/:address" element={<CampaignDetailView />} />

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
