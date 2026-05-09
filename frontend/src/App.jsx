import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';

import { useAuth } from './hooks/useAuth';
import RoleGuard from './components/RoleGuard';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Forbidden from './pages/Forbidden';
import DevTokens from './pages/DevTokens';

import Dashboard from './pages/Dashboard';
import MarkAttendance from './pages/MarkAttendance';
import StudentHistory from './pages/StudentHistory';
import MentorMaterials from './pages/MentorMaterials';
import Assignments from './pages/Assignments';

import BulkAttendance from './pages/BulkAttendance';
import Upcoming from './pages/student/Upcoming';
import MyAttendance from './pages/student/MyAttendance';
import StudentMaterials from './pages/student/StudentMaterials';
import StudentDashboard from './pages/student/StudentDashboard';



// Root redirect based on role
const RootRedirect = () => {
  const { session, userProfile, loading } = useAuth();
  
  if (loading) return null;
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If profile is loaded, use role to redirect
  if (userProfile) {
    if (userProfile.role === 'mentor') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/me/dashboard" replace />;
  }

  // Profile not yet loaded or missing — guess from email
  const email = session.user?.email || '';
  const isStudent = email.endsWith('@example.com') || email.endsWith('@forge.local');
  if (isStudent) {
    return <Navigate to="/me/dashboard" replace />;
  }

  // Default: assume mentor
  return <Navigate to="/dashboard" replace />;
};




function App() {
  const isWrongKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('sb_publishable');

  if (isWrongKey) {
    return (
      <div className="fixed inset-0 z-[9999] bg-void flex items-center justify-center p-6">

        <div className="card-hero max-w-2xl border-danger/50 bg-danger/5">
          <h2 className="text-h2 text-danger mb-4">CRITICAL CONFIGURATION ERROR</h2>
          <p className="text-body text-fg-primary mb-6">
            You have pasted a <strong>Stripe API Key</strong> into your <code>.env.local</code> file instead of a <strong>Supabase API Key</strong>.
          </p>
          <div className="bg-surface-inset p-4 rounded-lg mb-6 border border-border-default text-body-sm space-y-3">
            <p><strong>To fix this:</strong></p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Open your Supabase Dashboard.</li>
              <li>Go to <strong>Project Settings</strong> (gear icon) &gt; <strong>API</strong>.</li>
              <li>Find <strong>Project API keys</strong> and copy the <strong>anon public</strong> key.</li>
              <li>Replace the key in <code>frontend/.env.local</code> (Line 2).</li>
              <li><strong>Restart your terminal</strong> (Press Ctrl+C, then run <code>npm run dev</code>).</li>
            </ol>
          </div>
          <p className="text-caption text-fg-tertiary italic">
            Note: Supabase keys usually start with "eyJ...". Stripe keys start with "sb_publishable_...".
          </p>
        </div>
      </div>
    );
  }

  return (

    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/403" element={<Forbidden />} />
        <Route path="/dev-tokens" element={<DevTokens />} />
        
        {/* Protected routes wrapped in AppLayout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<RootRedirect />} />
          
          {/* Mentor Routes */}
          <Route element={<RoleGuard allowedRoles={['mentor']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/attendance" element={<MarkAttendance />} />
            <Route path="/history" element={<StudentHistory />} />
            <Route path="/materials" element={<MentorMaterials />} />
            <Route path="/upload" element={<BulkAttendance />} />
            <Route path="/assignments" element={<Assignments />} />
          </Route>
          
          {/* Student Routes */}
          <Route element={<RoleGuard allowedRoles={['student']} />}>
            <Route path="/me/dashboard" element={<StudentDashboard />} />
            <Route path="/me/attendance" element={<MyAttendance />} />
            <Route path="/me/upcoming" element={<Upcoming />} />
            <Route path="/me/materials" element={<StudentMaterials />} />
          </Route>
        </Route>
        
        {/* Catch-all redirect to Root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
