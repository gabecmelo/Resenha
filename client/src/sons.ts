let audioCtx: AudioContext | null = null;
let somAtivo = false;

function carregarPreferencia(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const salvo = window.localStorage.getItem('resenha:som');
    if (salvo !== null) {
      return salvo === 'true';
    }
  } catch (e) {
    // Ignora erro de localStorage
  }
  return true; // Default
}

function salvarPreferencia(ativo: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('resenha:som', String(ativo));
  } catch (e) {
    // Ignora
  }
}

function motionReduzido(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function somEstaAtivo(): boolean {
  return somAtivo;
}

export function ativarSom(ativo: boolean) {
  somAtivo = ativo;
  salvarPreferencia(ativo);
  if (ativo && !audioCtx) {
    inicializarAudio();
  }
}

export function inicializarAudio() {
  somAtivo = carregarPreferencia();
  if (!audioCtx && typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
}

function tocarTom(frequencia: number, tipo: OscillatorType, duracao: number, volume: number = 0.1) {
  if (!somAtivo || !audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = tipo;
  oscillator.frequency.setValueAtTime(frequencia, audioCtx.currentTime);

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracao);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duracao);
}

export function tocarSuaVez() {
  if (!somAtivo) return;
  tocarTom(440, 'sine', 0.15, 0.2);
  setTimeout(() => tocarTom(660, 'sine', 0.25, 0.2), 150);
}

export function tocarChatMensagem() {
  if (!somAtivo || motionReduzido()) return;
  tocarTom(800, 'sine', 0.1, 0.1);
}

export function tocarVezOutro() {
  if (!somAtivo) return;
  tocarTom(300, 'sine', 0.1, 0.1);
  setTimeout(() => tocarTom(400, 'sine', 0.1, 0.1), 100);
}

export function tocarAcertou() {
  if (!somAtivo) return;
  tocarTom(440, 'triangle', 0.1, 0.2);
  setTimeout(() => tocarTom(554, 'triangle', 0.1, 0.2), 100);
  setTimeout(() => tocarTom(659, 'triangle', 0.2, 0.2), 200);
  setTimeout(() => tocarTom(880, 'triangle', 0.4, 0.3), 300);
}

export function tocarTempoAcabando() {
  if (!somAtivo) return;
  tocarTom(800, 'square', 0.1, 0.05);
  setTimeout(() => tocarTom(1000, 'square', 0.1, 0.05), 150);
}

export function tocarTickContagem() {
  if (!somAtivo) return;
  tocarTom(900, 'square', 0.05, 0.05);
}

/** `FBK-01` — clique curto e discreto em qualquer botão habilitado. */
export function tocarClique() {
  if (!somAtivo) return;
  tocarTom(500, 'sine', 0.04, 0.06);
}

/** `FBK-03` — entrada de jogador na sala; timbre distinto dos demais sons. */
export function tocarEntrada() {
  if (!somAtivo) return;
  tocarTom(523, 'triangle', 0.1, 0.15);
  setTimeout(() => tocarTom(784, 'triangle', 0.2, 0.15), 90);
}

export function _resetParaTestes() {
  audioCtx = null;
  somAtivo = false;
}
