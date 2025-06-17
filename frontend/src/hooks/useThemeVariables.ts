import { useEffect } from 'react';

export const useThemeVariables = (darkMode: string) => {
  useEffect(() => {
    let themeVars: Record<string, string> = {};

    switch (darkMode) {
      case 'dark':
        themeVars = {
          '--body-bg-color': '#1f1f1f',
          '--body-text-color': '#f0f0f0',
          '--app-toolbar-bg': '#141414',
          '--app-toolbar-border': '#303030',
          '--canvas-area-bg': '#0f0f0f',
          '--canvas-grid-line': '#2c2c2c',
          '--entity-card-border': '#303030',
          '--attribute-item-border': '#2a2a2a',
          '--properties-panel-bg': '#141414',
          '--properties-panel-border': '#303030',
          '--property-label-color': '#8c8c8c',
          '--attribute-placeholder-color': '#595959',
          '--danger-zone-border': '#ff4d4f',
          '--primary-color': '#1677ff',
          '--primary-color-hover': '#4096ff',
          '--primary-color-active': '#0958d9',
        };
        break;

      case 'dark-red':
        themeVars = {
          '--body-bg-color': '#2a0008',
          '--body-text-color': '#ffeaea',
          '--app-toolbar-bg': '#3d000c',
          '--app-toolbar-border': '#5c1a1a',
          '--canvas-area-bg': '#200003',
          '--canvas-grid-line': '#5c1a1a',
          '--entity-card-border': '#a61d24',
          '--attribute-item-border': '#5c1a1a',
          '--properties-panel-bg': '#3d000c',
          '--properties-panel-border': '#a61d24',
          '--property-label-color': '#ffc1c1',
          '--attribute-placeholder-color': '#ffb3b3',
          '--danger-zone-border': '#ff4d4f',
          '--primary-color': '#f5222d',
          '--primary-color-hover': '#ff4d4f',
          '--primary-color-active': '#cf1322',
        };
        break;

      case 'dark-blue':
        themeVars = {
          '--body-bg-color': '#001529',
          '--body-text-color': '#d6e4ff',
          '--app-toolbar-bg': '#002244',
          '--app-toolbar-border': '#003a8c',
          '--canvas-area-bg': '#000c1a',
          '--canvas-grid-line': '#003a8c',
          '--entity-card-border': '#0050b3',
          '--attribute-item-border': '#003a8c',
          '--properties-panel-bg': '#002244',
          '--properties-panel-border': '#0050b3',
          '--property-label-color': '#adc6ff',
          '--attribute-placeholder-color': '#91d5ff',
          '--danger-zone-border': '#ff7875',
          '--primary-color': '#1890ff',
          '--primary-color-hover': '#40a9ff',
          '--primary-color-active': '#096dd9',
        };
        break;

      case 'light':
      default:
        themeVars = {
          '--body-bg-color': '#f0f2f5',
          '--body-text-color': '#333333',
          '--app-toolbar-bg': '#ffffff',
          '--app-toolbar-border': '#f0f0f0',
          '--canvas-area-bg': '#fafafa',
          '--canvas-grid-line': '#e0e0e0',
          '--entity-card-border': '#f0f0f0',
          '--attribute-item-border': '#f0f0f0',
          '--properties-panel-bg': '#ffffff',
          '--properties-panel-border': '#f0f0f0',
          '--property-label-color': '#595959',
          '--attribute-placeholder-color': '#8c8c8c',
          '--danger-zone-border': '#ff4d4f',
          '--primary-color': '#1677ff',
          '--primary-color-hover': '#4096ff',
          '--primary-color-active': '#0958d9',
        };
        break;
    }

    Object.entries(themeVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [darkMode]);
};
