import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, LoginCredentials } from '../types/index';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      let lastUserFetch = 0;
      const USER_CACHE_TIME = 5 * 60 * 1000; // 5分間キャッシュ

      return {
        user: null,
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
        isAuthenticated: !!localStorage.getItem('access_token'),
        isLoading: false,
        error: null,

      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });

          const response = await authAPI.login(credentials);
          const { access, refresh } = response.data;

          // トークンをローカルストレージに保存
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);

          // ユーザー情報を別途取得
          try {
            const userResponse = await authAPI.getCurrentUser();
            set({
              user: userResponse.data,
              accessToken: access,
              refreshToken: refresh,
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (userError) {
            // ユーザー情報取得に失敗してもログインは成功とする
            set({
              user: null,
              accessToken: access,
              refreshToken: refresh,
              isAuthenticated: true,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.non_field_errors?.[0] ||
                              error.response?.data?.detail ||
                              'ログインに失敗しました';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          // ローカルストレージからトークンを削除
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');

          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      getCurrentUser: async () => {
        try {
          console.log('AuthStore.getCurrentUser called');
          const currentState = get();
          const now = Date.now();

          // キャッシュタイムチェック、ユーザー情報の存在チェック、ローディング中チェック
          if (currentState.user || currentState.isLoading || (now - lastUserFetch < USER_CACHE_TIME)) {
            console.log('AuthStore.getCurrentUser: User already exists, loading, or recently fetched, skipping');
            return;
          }

          lastUserFetch = now;
          set({ isLoading: true, error: null });
          const response = await authAPI.getCurrentUser();
          console.log('AuthStore.getCurrentUser: Got user data', response.data);
          set({
            user: response.data,
            isLoading: false
          });
        } catch (error: any) {
          console.error('Get current user error:', error);

          // 認証エラーの場合はログアウト
          if (error.response?.status === 401) {
            get().logout();
          } else {
            set({
              isLoading: false,
              error: 'ユーザー情報の取得に失敗しました'
            });
          }
        }
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          set({ isLoading: true, error: null });
          const response = await authAPI.updateProfile(data);
          set({
            user: response.data,
            isLoading: false
          });
        } catch (error: any) {
          const errorMessage = error.response?.data?.detail ||
                              'プロフィールの更新に失敗しました';
          set({
            error: errorMessage,
            isLoading: false
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    };
  },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);