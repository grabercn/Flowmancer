// frontend/src/context/NotificationProvider.tsx

import React, { createContext, useContext } from 'react';
import { notification } from 'antd';
import type { NotificationInstance } from 'antd/es/notification/interface';

// Create a context to hold the notification API instance
const NotificationContext = createContext<NotificationInstance | null>(null);

// Create a custom hook to easily access the notification API from any component
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Create the provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();

  return (
    <NotificationContext.Provider value={api}>
      {contextHolder} {/* This is the magic part! It renders the antd notification containers */}
      {children}    {/* This renders the rest of your app */}
    </NotificationContext.Provider>
  );
};