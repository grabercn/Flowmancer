// frontend/src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App.tsx';
import { NotificationProvider } from './context/NotificationProvider.tsx';
import { UniversalProvider, useUniversal } from './context/UniversalProvider.tsx';
import { ConfigProvider, theme } from 'antd';
import 'antd/dist/reset.css';
import './index.css';
import { useThemeVariables } from './hooks/useThemeVariables.ts';

const WithProviders = () => {
  // here we set the properties and colors used for dark mode...
  const darkMode = useUniversal().settings.darkMode;
  if(darkMode == "system" && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      useThemeVariables("dark"); // this sets css props based on dark mode value
      useUniversal().settings.setDarkMode("dark");
    }  else if(darkMode == "system" && window.matchMedia('(prefers-color-scheme: light)').matches) {
      useThemeVariables("light");
      useUniversal().settings.setDarkMode("light");
  } else {
    useThemeVariables(darkMode);
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: darkMode.includes('dark') ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <NotificationProvider>
        <AppWrapper />
      </NotificationProvider>
    </ConfigProvider>
  );
};

const Root = () => (
  <UniversalProvider>
    <WithProviders />
  </UniversalProvider>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
