import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch the public.users profile for a given auth user ID.
   * Returns the profile data, or null if not found.
   * If no profile exists for a valid session, we force sign-out to
   * prevent a zombie-auth state (logged in but invisible to the app).
   */
  const fetchUserProfile = async (userId, autoSignOutIfMissing = false) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found in public.users for this auth user.
          if (autoSignOutIfMissing) {
            console.warn('AuthContext: Session exists but no public.users profile found. Signing out to reset.');
            await supabase.auth.signOut();
            setSession(null);
            setUserProfile(null);
            // Hard redirect so state is fully cleared
            window.location.href = '/login?reason=no_profile';
            return null;
          }
        } else {
          console.error('Error fetching user profile:', error.message, error.code);
        }
        setUserProfile(null);
        return null;
      }

      setUserProfile(data);
      return data;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      setUserProfile(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setSession(session);
          if (session?.user) {
            // Pass autoSignOutIfMissing=true so stale sessions are cleared
            await fetchUserProfile(session.user.id, true);
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('initSession error:', err);
        if (mounted) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user.id, true);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setLoading(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
