import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const RoleGuard = ({ allowedRoles }) => {
  const { session, userProfile, loading } = useAuth();
  const location = useLocation();

  // Show spinner while auth is resolving
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-void text-fg-secondary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Not logged in → go to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If profile is still loading/missing but we have a session, let them through
  // The individual pages handle missing student_id gracefully (show 0 stats)
  // AuthContext will auto-repair the profile in the background
  
  // Logged in with profile but wrong role → 403
  if (userProfile && allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
