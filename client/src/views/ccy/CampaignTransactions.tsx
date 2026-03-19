import { useNavigate } from 'react-router-dom';

// CampaignTransactions and TransactionFilter are now unified into UserTransactions (Transaction Explorer).
// These routes redirect there for backward compatibility.

export function CampaignTransactionsView() {
    const navigate = useNavigate();
    // Redirect to the unified transaction explorer
    navigate('/transactions/user');
    return null;
}
