import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileError, setProfileError] = useState(null); // null | 'NOT_FOUND' | 'FETCH_ERROR'
  const [loading, setLoading] = useState(true);
  const isSigningOut = useRef(false); // guard against duplicate signout calls

  const fetchUserProfile = useCallback(async (userId, authUser = null) => {
    console.log('[AuthContext] Fetching profile for:', userId);
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('[AuthContext] Profile row missing in public.users — attempting auto-repair...');
          
          const email = authUser?.email || '';
          const isStudentEmail = email.endsWith('@example.com') || email.endsWith('@forge.local');

          if (isStudentEmail) {
            // Extract USN from email (e.g. "4sh24cs001@example.com" → "4SH24CS001")
            const usn = email.split('@')[0].toUpperCase();
            console.log('[AuthContext] Looking up student by USN:', usn);

            const { data: student, error: stuErr } = await supabase
              .from('students')
              .select('id, name')
              .eq('usn', usn)
              .single();

            if (!stuErr && student) {
              console.log('[AuthContext] Found student record, creating profile...');
              const { data: newProfile, error: insertErr } = await supabase
                .from('users')
                .insert([{
                  id: userId,
                  email: email,
                  role: 'student',
                  student_id: student.id,
                  display_name: student.name
                }])
                .select()
                .single();

              if (!insertErr && newProfile) {
                console.log('[AuthContext] Student profile auto-repaired successfully');
                setUserProfile(newProfile);
                setProfileError(null);
                return;
              } else {
                console.error('[AuthContext] Profile insert failed:', insertErr?.message);
              }
            } else {
              console.warn('[AuthContext] No student found for USN:', usn);
            }
          } else {
            // Non-student (mentor) auto-repair
            console.log('[AuthContext] Auto-repairing mentor profile...');
            const { data: repairData, error: repairError } = await supabase
              .from('users')
              .insert([{
                id: authUser.id,
                email: email,
                role: 'mentor',
                display_name: authUser.user_metadata?.full_name || email.split('@')[0]
              }])
              .select()
              .single();
            
            if (!repairError && repairData) {
              setUserProfile(repairData);
              setProfileError(null);
              return;
            }
          }

          // Auto-repair failed — set error state
          setProfileError('NOT_FOUND');
          setUserProfile(null);
        } else {
          console.error('[AuthContext] Profile fetch error:', error.message);
          setProfileError('FETCH_ERROR');
          setUserProfile(null);
        }
      } else {
        console.log('[AuthContext] Profile loaded:', data.role);
        setUserProfile(data);
        setProfileError(null);
      }
    } catch (err) {
      console.error('[AuthContext] Unexpected fetch error:', err);
      setProfileError('FETCH_ERROR');
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('[AuthContext] Auth event:', event);
        
        if (!mounted) return;
        if (isSigningOut.current) return; // skip events during signout

        setSession(currentSession);
        
        if (currentSession?.user) {
          await fetchUserProfile(currentSession.user.id, currentSession.user);
        } else {
          setUserProfile(null);
          setProfileError(null);
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
    if (isSigningOut.current) return; // prevent duplicate signout calls
    isSigningOut.current = true;
    console.log('[AuthContext] Signing out...');
    try {
      setLoading(true);
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      });
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUserProfile(null);
      setProfileError(null);
      setLoading(false);
      isSigningOut.current = false;
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, profileError, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
