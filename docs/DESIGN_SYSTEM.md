# Design system — "Ateliê noturno"

Conceito: um ateliê de barbearia à noite, com mármore escuro, couro, latão e luz âmbar. Ele vem direto do vídeo de fundo. A marca precisa continuar reconhecível com as animações desligadas.

## Cores (`src/styles/index.css`)

| Token | RGB | Uso |
|---|---|---|
| `--ink` | 11 9 7 | Fundo principal (preto quente) |
| `--ink-2` / `--ink-3` | 20 16 12 / 31 25 20 | Superfícies, cartões |
| `--ivory` | 242 234 223 | Texto principal |
| `--muted` | 176 163 148 | Texto secundário (≈ 8:1 sobre `ink`) |
| `--brass` | 205 154 94 | Acento, CTA principal, estados ativos |
| `--brass-light` / `--brass-deep` | 232 194 140 / 140 96 52 | Gradiente do latão, preços |
| `--moss` | 38 63 54 | Apoio frio (reflexos 3D) |
| `--danger` | 236 128 104 | Erros |

Texto escuro sobre latão nos botões primários; nunca latão sobre latão.

## Tipografia

- **Bodoni Moda** (display, alto contraste; itálico para ênfase em latão): títulos, preços, números de capítulo.
- **Manrope** (texto e interface).
- Escala fluida com `clamp()`; campos de formulário com 16 px, para o iPhone não dar zoom.

## Estrutura narrativa

As seções são "lâminas" (`.slab`, bordas arredondadas) sobre o vídeo, alternando com "janelas" transparentes (`Interlude`, `Space`, `FinalCta`) onde o vídeo é o protagonista. Os capítulos são numerados em romano (I–XI), como num livro.

## Componentes base (`src/components/ui`)

`Button` / `LinkButton` / `ExternalButton` (primary, ghost, quiet; alvo mínimo de 48 px), `Icon` (traço fino de 1.5 px), `SmartImage` (srcset, proporção reservada, placeholder), `Reveal` / `MaskLines` / `ScrollWords` (motion), `SectionHeading`, `Monogram`.

## Motion

| Interação | Duração | Curva |
|---|---|---|
| Pressionar botão | 200 ms, escala 0.97 | expo-out |
| Accordion / menu | 280–600 ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Troca de etapa do agendamento | 280 ms, ±36 px com direção | expo-out |
| Entrada de bloco | 700 ms, 18 px | expo-out |
| Títulos | máscara por linha, 900 ms, stagger de 80 ms | expo-out |
| Vídeo de fundo | interpolação de 14% por frame até a posição do scroll | — |

Sem scroll-jacking, sem cursor customizado e sem parallax forte no celular. Com `prefers-reduced-motion` ou com o botão "Reduzir animações" no rodapé, o vídeo vira um poster estático, a medalha fica parada e as transições perdem o deslocamento.
