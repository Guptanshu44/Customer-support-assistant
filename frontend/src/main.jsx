import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Streamlit Component communication protocol
try {
  const notifyStreamlit = () => {
    window.parent?.postMessage({
      isStreamlitMessage: true,
      type: 'streamlit:componentReady',
      apiVersion: 1
    }, '*');
    window.parent?.postMessage({
      isStreamlitMessage: true,
      type: 'streamlit:setFrameHeight',
      height: Math.max(document.documentElement.scrollHeight, window.innerHeight, 1400)
    }, '*');
  };
  notifyStreamlit();
  window.addEventListener('load', notifyStreamlit);
  window.addEventListener('resize', notifyStreamlit);
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'streamlit:render') {
      notifyStreamlit();
    }
  });
} catch (e) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

