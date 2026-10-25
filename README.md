# RB Barbearia — site com vídeo no scroll, 3D e agendamento

Site mobile-first de barbearia no conceito **"Ateliê noturno"**: um vídeo de fundo que avança conforme a rolagem, seções editoriais com motion design, uma medalha 3D (Three.js + React Three Fiber + Drei), uma cadeira 3D interativa (Babylon.js) e um fluxo de agendamento completo.

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
| Vídeo no scroll | `src/components/background/ScrollFilm.tsx` | Vídeo convertido em 96 quadros WebP (vertical no celular, horizontal no desktop), carregamento progressivo, sem sequestrar o scroll |
| Página inicial | `src/pages/Home.tsx` + `src/components/sections/` | Hero, manifesto, serviços, ritual (fixado no desktop), barbeiros, estilos com lightbox, espaço, clube, localização, dúvidas, CTA final |
| Medalha 3D | `src/components/three/Medallion.tsx` | R3F + Drei, gravação desenhada em canvas com a fonte da marca, gira com a rolagem; só carrega perto da seção |
| Cadeira 3D | `src/pages/Experience3D.tsx` + `src/babylon/chairScene.ts` | Rota isolada `/experiencia-3d`, câmera com limites e pontos de vista, descarta a engine ao sair |
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

## Hospedagem

Qualquer hospedagem estática com fallback de SPA: `public/_redirects` (Cloudflare Pages / Netlify) e `vercel.json` (Vercel) já estão prontos. Os quadros do vídeo ficam em `public/media` com cache longo.

## Regenerar mídia

Se trocar o vídeo ou as fotos:

```bash
node scripts/prepare-assets.mjs <pasta-das-fotos-png> <video-horizontal.mp4> <video-vertical.mp4>
```

Requer `ffmpeg`. Gera os quadros, os posters e `src/data/media.json` / `src/data/frames.json`.

## Documentação

- `docs/DESIGN_SYSTEM.md`: cores, tipografia, espaçamento, componentes e motion
- `docs/MEDIA_GUIDE.md`: espaços de imagem, proporções e como substituir
- `docs/BOOKING.md`: regras de agendamento, estados e backend
- `docs/COMPONENT_SOURCES.md`: referências usadas (21st.dev) e adaptações
- `docs/prompts/`: os prompts mestres que guiaram o projeto
