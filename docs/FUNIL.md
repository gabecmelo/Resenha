# O funil da mesa

Como ler o que o Worker mede. Para operação de deploy, veja o [DEPLOY](DEPLOY.md).

## Por que isto existe

O Web Analytics conta pageview, e o app troca de endereço com `replaceState`
(`AJU-33`) — que não gera pageview novo. Na prática: entrar numa sala a partir
da home não aparece em lugar nenhum, e o caminho da pessoa fica invisível.

Duas semanas de produção (agosto de 2026) deram 120 visitas, todas diretas.
Dava pra ver que gente abriu quatro salas; não dava pra ver se quem chegou na
home criou alguma, nem se as salas criadas viraram partida. Sem isso, um pico de
mil visitas ensinaria o mesmo que as 120: nada.

## O que é medido

Cinco eventos, escritos pelo servidor no Workers Analytics Engine. Dataset
`resenha_funil` na produção, `resenha_funil_beta` no beta.

| Evento | Quando | `double2` |
| --- | --- | --- |
| `sala_criada` | a sala nasce (o 409 de colisão não conta) | 0 |
| `jogador_entrou` | entrada aceita | a posição na chegada — 1 é quem criou |
| `partida_iniciada` | o lobby vira escrita ou jogo | quantos estavam na mesa |
| `partida_encerrada` | a sala vai para encerrada | quantos estavam na mesa |
| `partida_abandonada` | a sala morre de inatividade **com partida em andamento** | quantos estavam na mesa |

Colunas: `blob1` tipo · `blob2` jogo · `double1` sempre 1 (é o que o `SUM`
conta) · `double2` a quantidade acima · `index1` a sala.

**A ordem das colunas é o esquema.** Depois que houver dado gravado, mexer numa
posição mistura duas coisas na mesma coluna: use uma posição nova.

## O que não é medido, de propósito

Nada que identifique pessoa: sem apelido, id de jogador, token, IP, código de
sala ou conteúdo de chat. A sala aparece como o **id opaco do Durable Object**,
que serve pra contar salas distintas e não serve pra entrar em sala nenhuma.

Isso não é escrúpulo decorativo — é o que mantém o produto sem banner de
consentimento. Qualquer campo novo aqui precisa passar por essa pergunta antes.

## Como consultar

Precisa de um token de API com permissão de leitura em Account Analytics e do
id da conta. Retenção: **três meses**.

```bash
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  --data "SELECT blob1 AS evento, SUM(double1) AS total FROM resenha_funil WHERE timestamp >= NOW() - INTERVAL '14' DAY GROUP BY blob1 ORDER BY total DESC"
```

### O funil inteiro, em uma consulta

```sql
SELECT blob1 AS evento, SUM(double1) AS total
FROM resenha_funil
WHERE timestamp >= NOW() - INTERVAL '14' DAY
GROUP BY blob1
ORDER BY total DESC
```

Leia de cima pra baixo: `sala_criada` → `partida_iniciada` → `partida_encerrada`.
Cada divisão é uma etapa do funil. `iniciada` muito abaixo de `criada` é gente
que monta a sala e não consegue (ou não quer) jogar.

O abandono é **medido**, não deduzido: `partida_abandonada` é a mesa que parou de
jogar e deixou a sala morrer. Deduzir por `iniciada − encerrada` daria número
errado, porque aí entram também as salas que ainda estavam em jogo na hora da
consulta.

### A pergunta que mais importa: quantas salas viram mesa?

Sala com uma pessoa é curiosidade. Com duas, é mesa.

Cada sala emite exatamente um `jogador_entrou` com `ordem = 1` e no máximo
um com `ordem = 2` — então somar as duas linhas conta salas, sem precisar de
`DISTINCT`.

```sql
SELECT
  sumIf(double1, double2 = 1) AS salas_com_alguem,
  sumIf(double1, double2 = 2) AS salas_com_dois_ou_mais
FROM resenha_funil
WHERE blob1 = 'jogador_entrou'
  AND timestamp >= NOW() - INTERVAL '14' DAY
```

### As mesas terminam ou desistem?

```sql
SELECT
  sumIf(double1, blob1 = 'partida_iniciada') AS comecaram,
  sumIf(double1, blob1 = 'partida_encerrada') AS terminaram,
  sumIf(double1, blob1 = 'partida_abandonada') AS abandonaram
FROM resenha_funil
WHERE timestamp >= NOW() - INTERVAL '14' DAY
```

O que sobra de `comecaram − terminaram − abandonaram` é partida ainda em curso.

### Qual jogo a mesa escolhe

```sql
SELECT blob2 AS jogo, SUM(double1) AS partidas
FROM resenha_funil
WHERE blob1 = 'partida_iniciada'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY blob2
ORDER BY partidas DESC
```

### Tamanho das mesas

```sql
SELECT double2 AS jogadores, SUM(double1) AS partidas
FROM resenha_funil
WHERE blob1 = 'partida_iniciada'
  AND timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY double2
ORDER BY jogadores
```

### Por dia, pra ver o efeito de uma divulgação

```sql
SELECT toStartOfDay(timestamp) AS dia, blob1 AS evento, SUM(double1) AS total
FROM resenha_funil
WHERE timestamp >= NOW() - INTERVAL '30' DAY
GROUP BY dia, blob1
ORDER BY dia
```

## Limites e custo

No plano **Free**: 100 mil pontos escritos por dia e 10 mil consultas por dia,
retenção de três meses, teto de 250 pontos por invocação de Worker. Uma partida
inteira de seis pessoas gasta nove pontos.

## Se sumir

O dataset nasce no primeiro `writeDataPoint` — não há nada a provisionar. Se a
consulta não devolve nada:

1. Espere 30 s: a escrita não é síncrona com a consulta.
2. Confira o binding `FUNIL` no `wrangler.jsonc` e republique — `wrangler types`
   precisa rodar depois de qualquer mudança lá.
3. `npx wrangler tail` mostra a escrita falhando. `registrar()` engole erro de
   propósito (`FUN-06`): telemetria não derruba partida, então o silêncio aqui é
   esperado e o `tail` é o único lugar onde ele aparece.
