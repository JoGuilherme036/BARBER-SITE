# RB Barbearia — site com vídeo no scroll, 3D e agendamento

Site mobile-first de barbearia no conceito **"Ateliê noturno"**: uma introdução em que o vídeo avança conforme a rolagem, uma agenda ao vivo, um cardápio de serviços com comanda, seções editoriais com motion design, uma medalha 3D (Three.js + React Three Fiber + Drei) e um fluxo de agendamento completo.

> ⚠️ **Versão de demonstração.** Nome, endereço, telefone, preços, equipe e planos são fictícios e estão marcados com `DEMO` em `src/config/`. Sem o Supabase configurado, as reservas ficam salvas só no navegador de quem testa.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/
npm test           # testes unitários (disponibilidade, horários, adaptador de reservas)
```

## O que tem no site

| Área | Onde | Destaques |
|---|---|---|
| Introdução com vídeo | `src/components/sections/Intro.tsx` + `background/ScrollFilm.tsx` | O vídeo toca só aqui, fixo na tela enquanto se rola: título legível sobre uma camada escura, duas legendas (a cadeira, a bancada), marcador de capítulos e botão "Pular introdução". A agenda sobe por cima do último quadro, sem tela vazia. Vídeo MP4 com um quadro-chave por frame (vertical 2,6 MB no celular, horizontal 4,3 MB no desktop), leve na memória |
| Agenda ao vivo | `src/components/sections/LiveBoard.tsx` | Próximos horários livres do serviço escolhido; um toque abre o agendamento já na etapa de dados |
| Serviços + comanda | `src/components/sections/Services.tsx`, `Comanda.tsx` | Toque em + para somar serviços numa comanda (tempo e total na hora); "Escolher horário" leva tudo para o agendamento. A barra inferior mostra quantos itens há na comanda |
| Página inicial | `src/pages/Home.tsx` + `src/components/sections/` | Manifesto, ritual (fixado no desktop), barbeiros, estilos com lightbox, espaço com a poltrona interativa, clube, localização, dúvidas, epílogo com o último quadro do vídeo |
| Medalha 3D | `src/components/three/Medallion.tsx` | R3F + Drei, gravação desenhada em canvas com a fonte da marca, vira com a rolagem; só carrega perto da seção |
| Agendamento | `src/pages/Booking.tsx` + `src/components/booking/` | Serviço → barbeiro (ou primeiro disponível) → dia/horário → dados → revisão → confirmação com código, .ics, Google Agenda, WhatsApp, rota |
| Meu agendamento | `src/pages/ManageBooking.tsx` | Consulta por código + telefone e cancelamento dentro da política |
| WhatsApp, rota, ligar | `src/lib/whatsapp.ts`, `src/lib/maps.ts` | Mensagens contextuais; Google Maps, Waze e Apple Mapas |
| Aberto agora | `src/lib/hours.ts` | Calculado no fuso da barbearia, com datas fechadas |
| SEO | `index.html`, `src/lib/seo.ts` | Título, Open Graph e JSON-LD `BarberShop` gerados do mesmo arquivo de configuração |

## Antes de publicar (checklist do dono)

1. **Dados reais** em `src/config/site.ts` (nome, WhatsApp, endereço, coordenadas, horários, datas fechadas) e troque `demo: true` por `false`.
2. **Catálogo e equipe** em `src/config/catalog.ts`; planos, FAQ e textos em `src/config/content.ts`.
3. **Fotos reais da equipe**: adicione as imagens e preencha `photo` de cada barbeiro (veja `docs/MEDIA_GUIDE.md`). Troque as imagens ilustrativas de estilos por trabalhos reais.
4. **Agenda real (Supabase)**: crie um projeto, rode `supabase/migrations/0001_booking.sql` e `supabase/seed.sql` (com os dados reais), e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (veja `.env.example`). Detalhes em `docs/BOOKING.md`.
5. **Domínio**: atualize `site.url`, `public/robots.txt` e `public/sitemap.xml`.
6. Revise `src/pages/Privacy.tsx` e as políticas de atraso/cancelamento.

## Visualização sem servidor

`npm run build:preview` gera `dist-preview/` com caminhos relativos e navegação por hash, para abrir o site em qualquer subpasta.

## Hospedagem

Qualquer hospedagem estática com fallback de SPA: `public/_redirects` (Cloudflare Pages / Netlify) e `vercel.json` (Vercel) já estão prontos. Os quadros do vídeo ficam em `public/media` com cache longo.

## Regenerar mídia

Se trocar o vídeo ou as fotos:

```bash
node scripts/prepare-assets.mjs <pasta-das-fotos-png> <video-horizontal.mp4> <video-vertical.mp4>
```

Requer `ffmpeg`. Gera os vídeos da introdução (MP4 + WebM), o primeiro e o último quadro e `src/data/media.json` / `src/data/film.json`.

## Documentação

- `docs/DESIGN_SYSTEM.md`: cores, tipografia, espaçamento, componentes e motion
- `docs/MEDIA_GUIDE.md`: espaços de imagem, proporções e como substituir
- `docs/BOOKING.md`: regras de agendamento, estados e backend
- `docs/COMPONENT_SOURCES.md`: referências usadas (21st.dev) e adaptações
- `docs/prompts/`: os prompts mestres que guiaram o projeto
