import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldAlert } from 'lucide-react';

const Forbidden = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  const handleReturn = () => {
    if (userProfile?.role === 'mentor') {
      navigate('/dashboard');
    } else if (userProfile?.role === 'student') {
      navigate('/me/attendance');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-void bg-cosmic-glow bg-no-repeat flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-20 h-20 bg-danger-bg border border-danger-border rounded-full flex items-center justify-center text-danger">
        <ShieldAlert className="w-10 h-10 stroke-[1.5px]" />
      </div>
      <h1 className="text-display-md text-fg-primary font-display">Access Denied</h1>
      <p className="text-body-lg text-fg-secondary max-w-md">
        You do not have permission to view this page. If you believe this is an error, please contact your program administrator.
      </p>
      <button onClick={handleReturn} className="btn-primary mt-4">
        Return Home
      </button>
    </div>
  );
};

export default Forbidden;
