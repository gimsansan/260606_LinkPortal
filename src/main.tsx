import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestPersistentStorageOnce } from './services/storage';
import './styles/global.css';
import './styles/theme.css';

void requestPersistentStorageOnce();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
