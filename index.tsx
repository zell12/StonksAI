
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Bootstrap Default Configuration
// Seeding localStorage ensures these keys appear in the Admin Console
// and are available to the financial services without hardcoding them in the service file.
const bootstrapConfiguration = () => {
  const DEFAULTS = {
    'quantai_api_polygon': '',
    'quantai_api_twelve_data': '',
    'quantai_api_financial_datasets': '',
    'quantai_api_news_api': '',
    'quantai_api_qandle': ''
  };

  if (typeof window !== 'undefined') {
    Object.entries(DEFAULTS).forEach(([key, value]) => {
      // Only set if key doesn't exist, to prevent overwriting user's manually entered keys
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, value);
      }
    });
  }
};

// Run bootstrap before rendering
bootstrapConfiguration();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
