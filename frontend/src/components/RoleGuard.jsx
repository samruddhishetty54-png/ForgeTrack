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

  // Not logged in at all → go to login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Session exists but no profile in public.users → go to login
  // (AuthContext will auto-sign-out, this is a safety net)
  if (!userProfile) {
    return <Navigate to="/login?reason=no_profile" replace />;
  }

  // Logged in but wrong role → 403
  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;
