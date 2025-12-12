import { supabase } from './supabase';

class AuthService {
  constructor() {
    this.lastRefreshTime = 0;
    this.refreshing = false;
  }

  /**
   * Get current user and refresh session if needed
   */
  async getCurrentUser() {
    try {
      console.log('🔐 Getting current user...');
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        return null;
      }

      if (!session) {
        console.log('📝 No active session, user needs to login');
        return null;
      }

      // Check if token is about to expire (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      console.log('⏱️ Token expires in:', timeUntilExpiry, 'seconds');

      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300) {
        console.log('🔄 Token expiring soon, refreshing...');
        const refreshed = await this.refreshSession();
        if (!refreshed) {
          console.log('⚠️ Could not refresh session, user may need to login again');
          return null;
        }
      }

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ Error getting user:', userError);
        return null;
      }

      if (user) {
        console.log('✅ User authenticated:', user.id);
      }

      return user;
    } catch (error) {
      console.error('❌ Error in getCurrentUser:', error);
      return null;
    }
  }

  /**
   * Refresh the current session token
   */
  async refreshSession() {
    try {
      // Prevent multiple simultaneous refresh attempts
      if (this.refreshing) {
        console.log('⏳ Refresh already in progress, waiting...');
        // Wait for existing refresh to complete
        const maxWaitTime = 5000; // 5 seconds max wait
        const startTime = Date.now();
        while (this.refreshing && Date.now() - startTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return !this.refreshing;
      }

      this.refreshing = true;

      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ Error refreshing session:', error);
        this.refreshing = false;
        return false;
      }

      if (session) {
        console.log('✅ Session refreshed successfully');
        this.lastRefreshTime = Date.now();
        this.refreshing = false;
        return true;
      }

      this.refreshing = false;
      return false;
    } catch (error) {
      console.error('❌ Error in refreshSession:', error);
      this.refreshing = false;
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  }

  /**
   * Sign out the user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Error signing out:', error);
        return false;
      }
      console.log('✅ User signed out successfully');
      return true;
    } catch (error) {
      console.error('❌ Error in signOut:', error);
      return false;
    }
  }

  /**
   * Get auth state change listener
   */
  onAuthStateChange(callback) {
    try {
      console.log('🔐 Setting up auth state change listener');
      
      // Use the newer subscription pattern
      const { data } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('🔐 Auth state changed:', event);
          if (callback && typeof callback === 'function') {
            callback(event, session);
          }
        }
      );
      
      // Return the subscription object
      return data?.subscription || data;
    } catch (error) {
      console.error('❌ Error setting up auth listener:', error);
      return null;
    }
  }

  /**
   * Handle JWT error - refresh and retry
   */
  async handleJWTError(error) {
    try {
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        console.warn('⏰ JWT error detected, attempting refresh...');
        const refreshed = await this.refreshSession();
        return refreshed;
      }
      return false;
    } catch (err) {
      console.error('❌ Error handling JWT error:', err);
      return false;
    }
  }

  /**
   * Get remaining time until token expires (in seconds)
   */
  async getTokenExpiryTime() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      return expiresAt - now;
    } catch (error) {
      console.error('❌ Error getting token expiry time:', error);
      return null;
    }
  }
}

export const authService = new AuthService();