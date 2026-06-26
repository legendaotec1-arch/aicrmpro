import React from 'react';
import ReactDOM from 'react-dom/client';

function App() {
  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', padding: 24, textAlign: 'center' }}>
      <h1 style={{ color: '#6A5ACD', margin: '0 0 12px' }}>React test</h1>
      <p style={{ color: '#64748b', margin: 0 }}>
        Минимальный React без router, API и useEffect.
      </p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
