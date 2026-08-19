import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { PACOTES } from '../shared/pacotes-dados';
import { LOCAIS } from '../shared/locais-dados';
import type { PacoteResumo } from '../shared/protocolo';

// `AD-014` — o índice cobre todos os jogos: sem os locais aqui, o Espião só
// funcionaria no fallback local. E sem `jogoId` o filtro por jogo devolve vazio.
const TODOS = [...PACOTES, ...LOCAIS];

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

for (const pacote of TODOS) {
  putKv(`pacote:${pacote.id}`, pacote);
}

console.log('Seed concluído com sucesso.');
