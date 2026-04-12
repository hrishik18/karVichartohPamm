import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    // A new version is available — activate it and reload
    const waitingWorker = registration.waiting;
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      waitingWorker.addEventListener('statechange', (e) => {
        if (e.target.state === 'activated') {
          window.location.reload();
        }
      });
    }
  },
});

// Check for service worker updates on focus and nightly at 12:00 AM IST
if ('serviceWorker' in navigator) {
  // Check when the app regains focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((reg) => reg.update());
    }
  });

  // Schedule nightly update check at 12:00 AM IST (UTC+5:30)
  const scheduleNightlyCheck = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);
    const midnightIST = new Date(nowIST);
    midnightIST.setUTCHours(0, 0, 0, 0);
    if (midnightIST <= nowIST) midnightIST.setUTCDate(midnightIST.getUTCDate() + 1);
    const msUntilMidnight = midnightIST.getTime() - nowIST.getTime();

    setTimeout(() => {
      navigator.serviceWorker.ready.then((reg) => reg.update());
      // Reschedule for next night
      scheduleNightlyCheck();
    }, msUntilMidnight);
  };
  scheduleNightlyCheck();
}
