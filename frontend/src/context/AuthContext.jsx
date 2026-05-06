import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (userId, authUser = null) => {
    console.log('[AuthContext] Fetching profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[AuthContext] Profile row missing in public.users');
          
          // Auto-repair for mentors/devs
          const isStudent = authUser?.email?.endsWith('@example.com') || authUser?.email?.endsWith('@forge.local');
          if (authUser?.email && !isStudent) {
            console.log('[AuthContext] Auto-repairing mentor profile...');
            const { data: repairData, error: repairError } = await supabase
              .from('users')
              .insert([{
                id: authUser.id,
                email: authUser.email,
                role: 'mentor',
                display_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0]
              }])
              .select()
              .single();
            
            if (!repairError && repairData) {
              setUserProfile(repairData);
              return;
            }
          }
        } else {
          console.error('[AuthContext] Profile fetch error:', error.message);
        }
        setUserProfile(null);
      } else {
        console.log('[AuthContext] Profile loaded:', data.role);
        setUserProfile(data);
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected fetch error:', err);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Handle session state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthContext] Auth event:', event);
        
        if (!mounted) return;
        
        setSession(currentSession);
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id, currentSession.user);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      if (initialSession?.user) {
        fetchUserProfile(initialSession.user.id, initialSession.user);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    try {
      setLoading(true);
      // Aggressive local cleanup
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      });
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUserProfile(null);
      setLoading(false);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
