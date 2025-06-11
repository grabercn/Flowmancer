// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './App.tsx'; // Import the wrapper export
import 'antd/dist/reset.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
);