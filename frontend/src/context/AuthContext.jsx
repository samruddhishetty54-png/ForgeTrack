import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isSigningOut = useRef(false);
  const fetchInProgress = useRef(null); // stores the userId currently being fetched

  const fetchUserProfile = useCallback(async (userId, authUser) => {
    // Prevent redundant or overlapping fetches
    if (fetchInProgress.current === userId) return;
    if (userProfile && userProfile.id === userId && !profileError) return;

    console.log('[AuthContext] Starting profile fetch for:', userId);
    fetchInProgress.current = userId;
    setLoading(true);
    setProfileError(null);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[AuthContext] Profile missing, attempting auto-repair...');
          const email = authUser?.email || '';
          const isStudent = email.endsWith('@example.com') || email.endsWith('@forge.local');
          const role = isStudent ? 'student' : 'mentor';

          // Basic repair attempt
          const { data: repaired, error: repairErr } = await supabase
            .from('users')
            .insert([{
              id: userId,
              email: email,
              role: role,
              display_name: authUser?.user_metadata?.full_name || email.split('@')[0]
            }])
            .select()
            .single();

          if (!repairErr && repaired) {
            console.log('[AuthContext] Auto-repair success');
            setUserProfile(repaired);
          } else {
            console.error('[AuthContext] Auto-repair failed:', repairErr?.message);
            setProfileError('NOT_FOUND');
            setUserProfile(null);
          }
        } else {
          console.error('[AuthContext] Profile fetch error:', error.message);
          setProfileError('FETCH_ERROR');
          setUserProfile(null);
        }
      } else {
        console.log('[AuthContext] Profile loaded:', data.role);
        setUserProfile(data);
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected error:', err);
      setProfileError('FETCH_ERROR');
    } finally {
      fetchInProgress.current = null;
      setLoading(false);
    }
  }, [userProfile, profileError]);

  useEffect(() => {
    let mounted = true;

    // Initial check
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        fetchUserProfile(s.user.id, s.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted || isSigningOut.current) return;
      console.log('[AuthContext] Auth event:', event);
      
      setSession(s);
      if (s?.user) {
        fetchUserProfile(s.user.id, s.user);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = async () => {
    if (isSigningOut.current) return;
    isSigningOut.current = true;
    setLoading(true);
    
    try {
      console.log('[AuthContext] Signing out...');
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear local state immediately for responsive UI
      setUserProfile(null);
      setSession(null);
      setProfileError(null);
      
      // Clear any leftover storage keys just in case
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });

      console.log('[AuthContext] Sign out complete, redirecting...');
    } catch (err) {
      console.error('[AuthContext] Sign out error:', err);
    } finally {
      // Use replace to avoid adding to history and to force a clean reload
      // We DON'T set loading(false) here because we want the app to stay in 
      // a loading state until the new page (/login) takes over.
      window.location.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, profileError, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth will be moved to src/hooks/useAuth.js to satisfy Vite Fast Refresh requirements
