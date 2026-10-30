import { Game } from './game.js';

const boot = () => {
  try {
    window.__warden = new Game();
  } catch (error) {
    console.error('The Hollow Warden failed to awaken.', error);
    const app = document.getElementById('app');
    if (app) {
      const notice = document.createElement('div');
      notice.className = 'noscript';
      notice.textContent = 'The court could not be drawn in this browser.';
      app.appendChild(notice);
    }
  }
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  queueMicrotask(boot);
} else {
  window.addEventListener('DOMContentLoaded', boot, { once: true });
}
