import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  inicializarAudio, 
  ativarSom, 
  somEstaAtivo, 
  tocarSuaVez, 
  tocarChatMensagem,
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
      AudioContext: vi.fn(() => mockAudioContext),
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
});
