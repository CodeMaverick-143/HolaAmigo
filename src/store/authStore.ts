import { create } from 'zustand';
import { supabase } from '../lib/supabase';

type User = {
  id: string;
  email?: string;
};

type AuthState = {
  user: User | null;
  session: any;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  register: (email: string, password: string, username: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  getSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error && data.user) {
      try {
        // First try to get the existing profile
        let { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
          
        // If no profile exists, create one
        if (!profileData && !profileError) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              username: email.split('@')[0], // Use email prefix as default username
              created_at: new Date().toISOString(),
              is_admin: false,
            })
            .select('*')
            .single();
            
          if (!createError && newProfile) {
            profileData = newProfile;
          } else {
            return { error: createError };
          }
        }
        
        if (profileError) {
          return { error: profileError };
        }
        
        set({ 
          user: data.user, 
          session: data.session,
          isAdmin: profileData?.is_admin || false,
          loading: false 
        });
      } catch (err) {
        return { error: err };
      }
    }
    
    return { error };
  },
  
  register: async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (!error && data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            created_at: new Date().toISOString(),
            is_admin: false,
          });
          
        if (profileError) {
          return { error: profileError };
        }
        
        set({ 
          user: data.user, 
          session: data.session,
          isAdmin: false, 
          loading: false 
        });
      } catch (err) {
        return { error: err };
      }
    }
    
    return { error };
  },
  
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAdmin: false });
  },
  
  getSession: async () => {
    set({ loading: true });
    
    try {
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData.user) {
          // First try to get the existing profile
          let { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.user.id)
            .single();
            
          // If no profile exists, create one
          if (!profileData && !profileError) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userData.user.id,
                username: userData.user.email?.split('@')[0] || 'user', // Use email prefix as default username
                created_at: new Date().toISOString(),
                is_admin: false,
              })
              .select('*')
              .single();
              
            if (!createError && newProfile) {
              profileData = newProfile;
            }
          }
            
          set({ 
            user: userData.user, 
            session: data.session,
            isAdmin: profileData?.is_admin || false,
            loading: false 
          });
          return;
        }
      }
    } catch (err) {
      console.error('Session retrieval error:', err);
    }
    
    set({ loading: false });
  },
}));