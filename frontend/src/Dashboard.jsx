import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Immediately redirect to main page
    navigate('/');
  }, [navigate]);

  return <div>Redirecting to home page...</div>;
};

export default Dashboard;


