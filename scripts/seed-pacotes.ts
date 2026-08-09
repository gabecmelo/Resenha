import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { PACOTES } from '../shared/pacotes-dados';

const resumos = PACOTES.map(p => ({
  id: p.id,
  emoji: p.emoji,
  nome: p.nome,
  descricao: p.descricao,
  quantidade: p.quantidade
}));

const isRemote = process.argv.includes('--remote');

function putKv(key: string, value: any) {
  const tmpFile = `temp_${key.replace(':', '_')}.json`;
  writeFileSync(tmpFile, JSON.stringify(value));
  try {
    console.log(`Gravando ${key}...`);
    if (isRemote) {
      execSync(`npx wrangler kv key put "${key}" --binding=PACOTES_KV --path="${tmpFile}"`, { stdio: 'inherit' });
    } else {
      execSync(`npx wrangler kv key put "${key}" --binding=PACOTES_KV --path="${tmpFile}" --local --persist-to="client/.wrangler/state/v3"`, { stdio: 'inherit' });
    }
  } finally {
    unlinkSync(tmpFile);
  }
}

console.log('Iniciando seed dos pacotes no KV...');
putKv('pacotes:indice', resumos);

for (const pacote of PACOTES) {
  putKv(`pacote:${pacote.id}`, pacote);
}

console.log('Seed concluído com sucesso.');
