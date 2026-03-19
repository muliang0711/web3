import { useNavigate } from 'react-router-dom';

// TransactionFilter is now part of the unified Transaction Explorer.
export function TransactionFilterView() {
    const navigate = useNavigate();
    navigate('/transactions/user');
    return null;
}
