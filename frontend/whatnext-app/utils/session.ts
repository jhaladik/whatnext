// Simple session storage utility for static export
export const sessionManager = {
  setSession: (sessionId: string, data: any) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('whatnext_session_id', sessionId);
      sessionStorage.setItem('whatnext_session_data', JSON.stringify(data));
      console.log('[SessionManager] Saved session:', sessionId);
    }
  },
  
  getSessionId: () => {
    if (typeof window !== 'undefined') {
      const id = sessionStorage.getItem('whatnext_session_id');
      console.log('[SessionManager] Retrieved session ID:', id);
      return id;
    }
    return null;
  },
  
  getSessionData: () => {
    if (typeof window !== 'undefined') {
      const data = sessionStorage.getItem('whatnext_session_data');
      if (data) {
        return JSON.parse(data);
      }
    }
    return null;
  },
  
  clearSession: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('whatnext_session_id');
      sessionStorage.removeItem('whatnext_session_data');
      console.log('[SessionManager] Cleared session');
    }
  }
};