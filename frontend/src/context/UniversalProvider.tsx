import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Utility functions for cookies
const setCookie = (name: string, value: string, days = 365) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const getCookie = (name: string) => {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
};

// Types for context values
type UniversalContextType = {
    darkMode: string;
    setDarkMode: (value: string) => void;
    apiKey: string;
    setApiKey: (value: string) => void;
    geminiModel: string;
    setGeminiModel: (value: string) => void;
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;
};

const UniversalContext = createContext<UniversalContextType | undefined>(undefined);

export const UniversalProvider = ({ children }: { children: ReactNode }) => {
    // Dark Mode
    const [darkMode, setDarkModeState] = useState<string>(() => getCookie('darkMode') || '');

    // Set dark mode to system theme
    useEffect(() => {
        if (!darkMode) {
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setDarkModeState(systemPrefersDark ? 'Dark' : 'Light');
        }
    }, []);

    // API Key
    const [apiKey, setApiKeyState] = useState<string>(() => getCookie('apiKey') || '');

    // Gemini Model
    const [geminiModel, setGeminiModelState] = useState<string>(() => getCookie('geminiModel') || '');

    // IsLoading is used when a process is happening that needs to disable AI functions
    const [isLoading, setIsLoadingState] = useState<boolean>(false);

    // Persist to cookies
    useEffect(() => { setCookie('darkMode', String(darkMode)); }, [darkMode]);
    useEffect(() => { setCookie('apiKey', apiKey); }, [apiKey]);
    useEffect(() => { setCookie('geminiModel', geminiModel); }, [geminiModel]);

    // Setters that also update state
    const setDarkMode = (value: string) => setDarkModeState(value);
    const setApiKey = (value: string) => setApiKeyState(value);
    const setIsLoading = (value: boolean) => setIsLoadingState(value);
    const setGeminiModel = (value: string) => setGeminiModelState(value);

    return (
        <UniversalContext.Provider value={{
            darkMode, setDarkMode,
            apiKey, setApiKey,
            geminiModel, setGeminiModel,
            isLoading, setIsLoading
        }}>
            {children}
        </UniversalContext.Provider>
    );
};

// Hook for easy usage
export const useUniversal = () => {
    const context = useContext(UniversalContext);
    if (!context) throw new Error('useUniversal must be used within a UniversalProvider');
    // Return both values and setters for convenience
    return {
        darkMode: context.darkMode,
        setDarkMode: context.setDarkMode,
        apiKey: context.apiKey,
        setApiKey: context.setApiKey,
        geminiModel: context.geminiModel,
        setGeminiModel: context.setGeminiModel,
        setIsLoading: context.setIsLoading,
        isLoading: context.isLoading,
    };
};