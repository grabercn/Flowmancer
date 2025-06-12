// frontend/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App.tsx';
import { NotificationProvider } from './context/NotificationProvider.tsx'; // <-- Import the provider
import 'antd/dist/reset.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationProvider> {/* <-- Wrap your app */}
      <AppWrapper />
    </NotificationProvider>
  </React.StrictMode>,
);