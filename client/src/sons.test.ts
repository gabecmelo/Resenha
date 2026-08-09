import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  inicializarAudio,
  ativarSom,
  somEstaAtivo,
  tocarSuaVez,
  tocarChatMensagem,
  tocarClique,
  tocarEntrada,
  _resetParaTestes
} from './sons';

describe('sons', () => {
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockGain: any;

  beforeEach(() => {
    mockOscillator = {
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    
    mockGain = {
      gain: { 
        setValueAtTime: vi.fn(), 
        exponentialRampToValueAtTime: vi.fn() 
      },
      connect: vi.fn(),
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 0,
      resume: vi.fn(),
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
    };

    vi.stubGlobal('window', {
      AudioContext: vi.fn(function () {
        return mockAudioContext;
      }),
      matchMedia: vi.fn(() => ({ matches: false })),
      localStorage: {
        getItem: vi.fn(() => 'true'),
        setItem: vi.fn(),
      },
    });

    _resetParaTestes();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('inicializarAudio deve carregar a preferencia e instanciar AudioContext', () => {
    inicializarAudio();
    expect(somEstaAtivo()).toBe(true);
    expect(window.AudioContext).toHaveBeenCalled();
  });

  it('ativarSom deve atualizar estado e salvar no localStorage', () => {
    ativarSom(false);
    expect(somEstaAtivo()).toBe(false);
    expect(window.localStorage.setItem).toHaveBeenCalledWith('resenha:som', 'false');
  });

  it('tocarSuaVez deve usar o AudioContext quando ativo', () => {
    inicializarAudio();
    tocarSuaVez();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it('tocarChatMensagem deve tocar se motion nao for reduzido', () => {
    inicializarAudio();
    tocarChatMensagem();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it('tocarClique deve tocar um tom curto quando o som esta ativo (FBK-01)', () => {
    inicializarAudio();
    tocarClique();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(500, 0);
  });

  it('tocarClique nao deve tocar nada quando o som esta desativado (FBK-04)', () => {
    inicializarAudio();
    ativarSom(false);
    tocarClique();
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });

  it('tocarEntrada deve tocar um tom distinto dos demais sons quando ativo (FBK-03)', () => {
    inicializarAudio();
    tocarEntrada();
    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(523, 0);
    expect(mockOscillator.type).toBe('triangle');
  });

  it('tocarEntrada nao deve tocar nada quando o som esta desativado (FBK-04)', () => {
    inicializarAudio();
    ativarSom(false);
    tocarEntrada();
    expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
  });
});
