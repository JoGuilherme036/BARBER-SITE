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

- **Sem reserva dupla**: constraint `EXCLUDE USING gist (professional_id WITH =, tstzrange(starts_at, busy_until) WITH &&)` no Postgres. Testado com 6 requisições simultâneas para o mesmo horário: exatamente 1 confirmada.
- **Idempotência**: cada tentativa leva uma `idempotency_key`; repetir o envio (clique duplo, rede instável) devolve a mesma reserva.
- **Primeiro disponível**: o servidor tenta os barbeiros em ordem dentro da mesma função; se outro cliente pegar o horário, passa ao próximo.
- **Revalidação no envio**: expediente, antecedência, datas fechadas e folgas são checados de novo no servidor.
- **Preço e duração congelados** na reserva (snapshot).
- **Privacidade**: `get_busy` devolve só intervalos ocupados; consultar e cancelar exige código + telefone. O papel anônimo não lê nenhuma tabela (RLS ativo, sem políticas).

## Estados

`confirmed` → `cancelled` (pelo cliente até 2 h antes, ou pela equipe), `completed`, `no_show` (para a equipe registrar). Só `confirmed` ocupa a agenda.

## Modos

- **Demonstração** (sem variáveis de ambiente): `src/booking/localApi.ts` simula o servidor no navegador com as mesmas regras. Os avisos de "modo demonstração" aparecem no fluxo.
- **Real**: `src/booking/supabaseApi.ts` chama as funções `get_busy`, `create_booking`, `find_booking` e `cancel_booking` via PostgREST.

## Ainda não incluído (próximas fases)

- Painel administrativo (agenda do dia, bloqueios, cadastros). Até lá, a equipe usa o painel do Supabase (`bookings`, `time_off`, `closed_dates`).
- Lembretes automáticos por WhatsApp/e-mail (dependem de provedor e credenciais).
- Remarcação atômica online: hoje é feita pelo WhatsApp.
- Rate limit e captcha (recomendado: Cloudflare Turnstile + Edge Function na frente de `create_booking`).
