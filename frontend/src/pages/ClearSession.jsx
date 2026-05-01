import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Navigate to this page (/clear) to forcibly wipe the session and go to login.
const ClearSession = () => {
  useEffect(() => {
    async function clear() {
      await supabase.auth.signOut();
      // Also clear any leftover localStorage keys
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('sb-')) localStorage.removeItem(k);
      });
      window.location.replace('/login');
    }
    clear();
  }, []);

  return (
    <div style={{
      minHeight: '100vh', background: '#0B0B11',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'sans-serif', fontSize: 16
    }}>
      Clearing session… redirecting to login.
    </div>
  );
};

export default ClearSession;
