# Redesign Bancada — o que ficou esperando você

Tudo do handoff que dava pra implementar com o contrato atual está no código e
verificado no navegador (fluxo completo de Quem Sou Eu? e de Espião, 360px e
1280px, claro e escuro). O que está abaixo **não** foi implementado porque
depende de uma decisão sua ou de mudar o protocolo — não é bug nem esquecimento.

## 1. Veredito da revelação do Espião (precisa mudar o protocolo)

O design pede, na revelação:

- selo **A MESA ACERTOU** / **A MESA ERROU**, com a contagem ("5 de 6 votos",
  "acusou o Caio com 5 de 8 votos — e ele não era");
- bloco **COMO A MESA VOTOU**, quem votou em quem;
- "a mesa protegeu por 7:12".

Nada disso existe em `ProjecaoEspiao` depois que a partida encerra: `votacaoAberta`
some e não sobra registro do resultado nem do tempo de rodada. Hoje a tela mostra
só o local e os espiões, que é o que dá pra dizer com verdade.

**Decisão sua:** vale estender a projeção com um `resultado` (acusado, votos,
acertou/errou, duração)? É a mudança que mais devolve valor do design nessa tela.

## 2. Quem abriu a votação

O design escreve "a **Bia** abriu" na faixa. A projeção não diz quem abriu.
Hoje a faixa diz "N de M já votaram · relógio pausado". Mesma pergunta: incluir
`abertaPor` em `votacaoAberta`?

## 3. Relógio pausado com o valor congelado

Design: `⏸ 5:48`. O servidor manda `prazoRodada: null` quando pausa, então o
valor congelado não chega ao cliente. Hoje a faixa mostra `⏸ pausado`.
Alternativa: mandar `restanteCongeladoMs` junto.

## 4. "Voltar ao lobby" na revelação

O design coloca dois botões na revelação (Nova partida + Voltar ao lobby). Não
existe comando de "voltar ao lobby" no protocolo — `novaPartida` já devolve a
mesa ao lobby, então hoje só ele aparece. Quer os dois separados?

## 5. Enigmas Macabros

Você perguntou se eu conheço. Encaixa bem no kit: carta-herói pública (o enigma),
assimetria de informação (uma pessoa sabe a solução inteira) e um padrão novo —
o narrador respondendo sim/não —, que é primo do juiz rotativo do Cartas Contra a
Turma. **Adiciono ao catálogo como `emBreve`** (do jeito que o Cartas está) ou
deixo fora até virar prioridade?

## 6. Papel do Espião: começa aberto

Você dispensou o "segure pra ver". Implementei como alternador simples
(`esconder papel ▴` / `mostrar papel ▾`) e ele **começa aberto** a cada rodada.
O design sugeria que, depois da primeira olhada, o padrão fosse guardado.
Prefere que comece recolhido?

## 7. Coisas que decidi sozinho (só pra você conferir depois)

- **Notas e resenha em painel que abre no lugar**, nunca em modal — a regra que
  você deu pras notas vale igual pro chat, pelo mesmo motivo (ninguém pode ser
  obrigado a fechar uma caixa pra agir). No desktop os dois começam abertos na
  coluna lateral; no celular, recolhidos.
- **Barra fixa no rodapé** em todas as telas de partida, como combinado.
- `IndicadorDeVez` e `FichaDeJogador` foram removidos: a faixa de fase e a ficha
  da mesa cobrem os dois casos.
- A mesa do Quem Sou Eu? passou a ser **2 colunas no celular** também fora do
  modo compacto — 1 coluna deixava 6 cartas com rolagem demais.
