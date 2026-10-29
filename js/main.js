import { Game } from './game.js';

const game = new Game();
window.game = game;

game.start().catch(err => {
  console.error(err);
  const ui = document.getElementById('ui');
  if (!ui) return;
  ui.innerHTML = '<div class="boot"><div class="boot-logo">PES 2027<span>STICKMAN 2D</span></div><div class="boot-note">Falha ao iniciar o jogo. Recarregue a página.</div></div>';
});
