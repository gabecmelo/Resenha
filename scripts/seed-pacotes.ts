import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { PACOTES } from '../shared/pacotes-dados';
import { LOCAIS } from '../shared/locais-dados';
import { CARTAS_TURMA } from '../shared/cartas-turma-dados';
import { ENIGMAS } from '../shared/enigmas-dados';
import { CARTAS_DEDO } from '../shared/dedo-dados';
import type { PacoteResumo } from '../shared/protocolo';

// `AD-014` — o índice cobre **todos** os jogos: é ele que o lobby lê pra
// desenhar o seletor de pacotes. Faltar um jogo aqui não quebra nada de
// imediato, porque o Durable Object cai num fallback que lê `shared/` direto —
// e é justamente isso que esconde o erro: enquanto o KV estiver vazio tudo
// aparece, e no dia em que este script rodar o que ficou de fora some do
// lobby. Cartas, Enigmas e Dedo na Cara faltavam aqui.
const TODOS = [...PACOTES, ...LOCAIS, ...CARTAS_TURMA, ...ENIGMAS, ...CARTAS_DEDO];

const resumos: PacoteResumo[] = TODOS.map(p => ({
  id: p.id,
  emoji: p.emoji,
  nome: p.nome,
  descricao: p.descricao,
  quantidade: p.quantidade,
  jogoId: p.jogoId
}));

const isRemote = process.argv.includes('--remote');

// `--beta` grava no KV do staging (`resenha-beta`), que é um namespace
// separado do de produção. Sem a flag, `--remote` escreve na produção — é o
// comportamento antigo, mantido de propósito pra não mudar o que já era usado.
const isBeta = process.argv.includes('--beta');
const alvo = isBeta ? ' --env beta' : '';

function putKv(key: string, value: unknown) {
  const tmpFile = `temp_${key.replace(':', '_')}.json`;
  writeFileSync(tmpFile, JSON.stringify(value));
  try {
    console.log(`Gravando ${key}...`);
    if (isRemote) {
      execSync(`npx wrangler kv key put "${key}" --binding=PACOTES_KV${alvo} --path="${tmpFile}"`, { stdio: 'inherit' });
    } else {
      execSync(`npx wrangler kv key put "${key}" --binding=PACOTES_KV --path="${tmpFile}" --local --persist-to="client/.wrangler/state/v3"`, { stdio: 'inherit' });
    }
  } finally {
    unlinkSync(tmpFile);
  }
}

const onde = isRemote ? (isBeta ? 'beta (resenha-beta)' : 'produção (resenha)') : 'local';
console.log(`Iniciando seed dos pacotes no KV — ${onde}...`);
putKv('pacotes:indice', resumos);

// O pacote inteiro só é lido do KV por quem usa `PacoteCompleto` (Quem Sou Eu
// e Espião, em `buscarUmPacote`). Cartas, Enigmas e Dedo na Cara têm formato
// próprio e leem de `shared/` dentro do próprio `iniciarRodada`, então gravar
// o conteúdo deles aqui só ocuparia o KV à toa.
for (const pacote of [...PACOTES, ...LOCAIS]) {
  putKv(`pacote:${pacote.id}`, pacote);
}

console.log('Seed concluído com sucesso.');
