import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Utility functions for cookies
const setCookie = (name: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const getCookie = (name: string) => {
  const raw = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1];

  return raw ? decodeURIComponent(raw) : undefined;
};


// Types for grouped context
type Brand = {
  name: string;
}

type Settings = {
  darkMode: string;
  apiKey: string;
  geminiModel: string;

  setDarkMode: (value: string) => void;
  setApiKey: (value: string) => void;
  setGeminiModel: (value: string) => void;
};

type State = {
  isLoading: boolean;
  isFrontEndMode: boolean;
  setIsLoading: (value: boolean) => void;
  setIsFrontEndMode: (value: boolean) => void;
};

type Data = {
  backendSummary: string;
  setBackendSummary: (value: string) => void;
};

type UniversalContextType = {
  brand: Brand;
  settings: Settings;
  state: State;
  data: Data;
};

const UniversalContext = createContext<UniversalContextType | undefined>(undefined);

export const UniversalProvider = ({ children }: { children: ReactNode }) => {
  // Brand info (static here, could be extended)
  const brand: Brand = {
    name: 'Flowmancer',
  };

  // Settings state
  const [darkMode, setDarkModeState] = useState<string>(() => getCookie('darkMode') || '');
  const [apiKey, setApiKeyState] = useState<string>(() => getCookie('apiKey') || '');
  const [geminiModel, setGeminiModelState] = useState<string>(() => getCookie('geminiModel') || '');

  // Loading state
  const [isLoading, setIsLoadingState] = useState<boolean>(false);
  const [isFrontEndMode, setIsFrontEndModeState] = useState<boolean>(() => getCookie('isFrontEndMode') === 'true')

  // Data state
  const [backendSummary, setBackendSummary] = useState<string>('')
  // Initialize darkMode to system if empty
  useEffect(() => {
    if (!darkMode) {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkModeState(systemPrefersDark ? 'Dark' : 'Light');
    }
  }, []);

  // Consolidate cookie setting into one useEffect
  useEffect(() => {
    setCookie('darkMode', darkMode);
    setCookie('apiKey', apiKey);
    setCookie('geminiModel', geminiModel);
    setCookie('isFrontEndMode', isFrontEndMode.toString());
  }, [darkMode, apiKey, geminiModel, isFrontEndMode]);

  // Wrapped setters
  const settings: Settings = {
    darkMode,
    apiKey,
    geminiModel,
    setDarkMode: setDarkModeState,
    setApiKey: setApiKeyState,
    setGeminiModel: setGeminiModelState,
  };

  const state: State = {
    isFrontEndMode,
    isLoading,
    setIsLoading: setIsLoadingState,
    setIsFrontEndMode: setIsFrontEndModeState,
  };

  const data: Data = {
    backendSummary,
    setBackendSummary,
  };

  return (
    <UniversalContext.Provider value={{ brand, settings, state, data }}>
      {children}
    </UniversalContext.Provider>
  );
};

// Hook for easy usage
export const useUniversal = () => {
  const context = useContext(UniversalContext);
  if (!context) throw new Error('useUniversal must be used within a UniversalProvider');

  // Return grouped objects for clarity
  return {
    brand: context.brand,
    settings: context.settings,
    state: context.state,
    data: context.data,
  };
};
