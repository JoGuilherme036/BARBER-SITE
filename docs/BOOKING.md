# Agendamento — regras e backend

## Atalhos a partir da página inicial

- **Agenda ao vivo**: `/agendar?servico=…&dia=AAAA-MM-DD&hora=HH:MM` abre direto na etapa de dados com "primeiro disponível"; o servidor revalida o horário na confirmação.
- **Comanda**: os serviços marcados na página inicial ficam no mesmo rascunho do agendamento; `/agendar?de=comanda` começa na escolha do barbeiro.
- **Barbeiro / serviço**: `?barbeiro=…` e `?servico=…` pré-selecionam a escolha.

## Fluxo

1. **Serviços**: seleção múltipla. Um combo substitui os serviços que já inclui, e nada é cobrado duas vezes (`summarize`).
2. **Barbeiro**: mostra só quem faz *todos* os serviços escolhidos, mais a opção "Primeiro disponível".
3. **Dia e horário**: faixa de 30 dias. Os horários respeitam o expediente do barbeiro ∩ o horário da casa, as pausas, as datas fechadas, a duração total, os 10 min de preparação, a antecedência mínima (60 min) e o horizonte de 30 dias. Quando o dia não tem vaga, o site oferece "próximo dia com vaga" ou pedir encaixe pelo WhatsApp (o que **não** é uma reserva).
4. **Dados**: nome e WhatsApp (aceita colar com +55, espaços e traços); e-mail e observações opcionais. Sem cadastro.
5. **Revisão**: aceite obrigatório da política.
6. **Confirmação**: só depois da resposta do servidor. Mostra código, .ics, Google Agenda, WhatsApp, rota, compartilhar e gerenciar.

O rascunho é um estado compartilhado (página inicial e agendamento) salvo em `sessionStorage`: sobrevive a recarregar a página e ao botão voltar.

## Garantias

- **Sem reserva dupla**: a gravação é um único `INSERT … WHERE NOT EXISTS` no D1 (SQLite serializa as escritas), que confere reservas e bloqueios que se sobrepõem, já com os 10 min de preparação. Há também um índice único por barbeiro e horário de início. Testado com 6 pedidos simultâneos para o mesmo horário: 1 confirmado e 5 recusados (`409 slot_taken`).
- **Idempotência**: cada tentativa leva uma `idempotency_key`; repetir o envio (clique duplo, rede instável) devolve a mesma reserva.
- **Primeiro disponível**: o servidor tenta os barbeiros em ordem e grava com o primeiro que estiver livre de verdade.
- **Mesmas regras no site e no servidor**: `server/api.ts` importa `src/booking/availability.ts` (expediente, pausas, duração, antecedência, horizonte).
- **Preço e duração congelados** na reserva.
- **Privacidade**: `/api/busy` devolve só intervalos ocupados; consultar e cancelar exige código + telefone; o painel exige a senha `ADMIN_TOKEN` (comparação em tempo constante).

## Bloqueios (painel `/admin`)

- **Quem**: toda a barbearia ou um barbeiro.
- **O quê**: um intervalo de horário ou o dia inteiro, em um ou vários dias seguidos (até 90, para férias).
- O bloqueio passa a valer na hora para novas reservas. Se já havia clientes marcados no período, o painel lista quem são, com um botão de WhatsApp para avisar e remarcar.
- Dias inteiros bloqueados aparecem desativados na faixa de datas do agendamento.

## Sincronização entre aparelhos

Toda mudança (reserva, cancelamento, bloqueio, status) incrementa um número de versão no banco. As telas que mostram horários consultam esse número (agendamento a cada 10 s, agenda ao vivo a cada 15 s enquanto visível, painel a cada 5 s) e também ao voltar para a aba ou reconectar; quando muda, recarregam os horários sem piscar a tela. Abas do mesmo aparelho são avisadas na hora (BroadcastChannel). Se o horário escolhido pelo cliente some, ele vê um aviso e escolhe outro.

Testado com dois navegadores: um bloqueio feito no painel sumiu do celular do cliente em ~5 s, um dia inteiro bloqueado foi desativado em ~8 s e uma reserva feita no celular apareceu no painel em menos de 1 s.

## Estados

`confirmed` → `cancelled` (pelo cliente até 2 h antes, ou pela equipe), `completed`, `no_show`. Só `confirmed` ocupa a agenda.

## API (`/api`)

| Método | Rota | Uso |
|---|---|---|
| GET | `/version` | número de versão da agenda |
| GET | `/busy?day=` | intervalos ocupados por barbeiro |
| GET | `/closures?from=&to=` | dias inteiros bloqueados |
| POST | `/bookings` | criar reserva |
| POST | `/bookings/lookup` · `/bookings/cancel` | consultar / cancelar (código + telefone) |
| GET | `/admin/day?day=` | agenda completa do dia (senha) |
| POST · DELETE | `/admin/blocks` · `/admin/blocks/:id` | criar / remover bloqueio (senha) |
| POST | `/admin/bookings/:code/status` | concluir, faltou, cancelar (senha) |

## Modos

- **Cloudflare** (builds de produção, `.env.production`): `src/booking/cloudflareApi.ts`.
- **Demonstração** (`npm run dev` e prévia estática): `src/booking/localApi.ts` simula o servidor no navegador, inclusive o painel (senha `demo`).

## Ainda não incluído

- Lembretes automáticos por WhatsApp/e-mail (dependem de provedor e credenciais).
- Remarcação online pelo cliente (hoje é pelo WhatsApp).
- Limite de requisições e captcha: recomendo uma regra de rate limiting da Cloudflare em `/api/bookings` e, se houver spam, o Turnstile.
