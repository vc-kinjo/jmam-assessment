// 通知状態管理

import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  duration?: number; // milliseconds
  timestamp: number;
}

interface NotificationState {
  notifications: Notification[];
  
  // アクション
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration || (notification.autoClose !== false ? 5000 : undefined)
    };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    // 自動削除
    if (newNotification.duration) {
      setTimeout(() => {
        get().removeNotification(id);
      }, newNotification.duration);
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  clearAll: () => {
    set({ notifications: [] });
  }
}));

// 便利関数
export const useNotifications = () => {
  const { addNotification } = useNotificationStore();

  const showSuccess = (title: string, message?: string) => {
    addNotification({
      title,
      message: message || '',
      type: 'success',
      autoClose: true
    });
  };

  const showError = (title: string, message?: string) => {
    addNotification({
      title,
      message: message || '',
      type: 'error',
      autoClose: false
    });
  };

  const showWarning = (title: string, message?: string) => {
    addNotification({
      title,
      message: message || '',
      type: 'warning',
      autoClose: true,
      duration: 7000
    });
  };

  const showInfo = (title: string, message?: string) => {
    addNotification({
      title,
      message: message || '',
      type: 'info',
      autoClose: true
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};