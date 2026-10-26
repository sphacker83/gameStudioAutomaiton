import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppStateProvider } from './appState';
import { App } from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root 요소를 찾을 수 없습니다.');

async function start() {
  if (import.meta.env.DEV) {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('preview-token');
    if (token) {
      window.history.replaceState(null, '', window.location.pathname);
      try { await fetch('/__appops_dev_session', { method: 'POST', headers: { 'x-appops-preview': token } }); } catch {}
    }
  }
  createRoot(container!).render(
    <StrictMode><AppStateProvider><App /></AppStateProvider></StrictMode>,
  );
}
void start();
