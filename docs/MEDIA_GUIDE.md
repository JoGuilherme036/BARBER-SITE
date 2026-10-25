# Guia de mídia

As imagens ficam em `public/media/img/<id>-<largura>.webp` e são descritas em `src/data/media.json` (gerado pelo script). Os componentes referenciam só o **id**: para trocar uma foto, gere de novo com o mesmo id.

## Espaços atuais

| id | Onde aparece | Proporção de origem | Observação |
|---|---|---|---|
| `servico-corte` | Serviço "Fade", estilos | 4:5 | |
| `servico-barba` | Serviço "Barba ritual", ritual (03), estilos | 4:5 | |
| `estilo-barba` | Combo, estilos | 4:5 | |
| `estilo-cachos` / `estilo-classico` / `estilo-ondulado` | Estilos, serviços | 4:5 | **Ilustrativas**: troque por trabalhos reais |
| `ambiente-principal` | O espaço, ritual (01) | 16:9 | Ideal: foto real do salão |
| `poltrona-vertical` | Poltrona com pontos interativos (O espaço) | 9:16 | Se trocar a foto, ajuste as posições dos pontos em `Space.tsx` |
| `poltrona-horizontal` | Mapa (antes de carregar) | 16:9 | |
| `produto-pomada` | "Na bancada" | 1:1 | |
| `ritual-toalha` / `ritual-bancada` | Ritual (02, 04), espaço | 3:2 | |
| *(faltando)* `barbeiro-<id>` | Cards da equipe | 4:5 | Retrato real; depois preencha `photo: 'barbeiro-<id>'` em `catalog.ts` |
| *(faltando)* `fachada` | Localização | 3:2 | Entrada real, reconhecível por quem chega |

## Vídeo da introdução

- `public/media/film/portrait.mp4` (540×960) para telas em pé e `landscape.mp4` (1280×720) para telas deitadas, com um quadro-chave em cada frame: assim o vídeo pula para qualquer ponto na hora, e o celular guarda só o quadro atual na memória. Os `.webm` são reserva para navegadores sem H.264.
- O site baixa o vídeo inteiro antes de começar a rolar com ele; até lá aparece `poster-*.webp` (primeiro quadro), que também é a imagem fixa com movimento reduzido ou economia de dados.
- `end-*.webp` (último quadro) é o fundo do epílogo e da tela de agendamento.
- Para trocar, rode o script com os dois vídeos novos (8 s, 24 fps funcionam bem; pense o movimento de câmera como uma jornada do salão até a bancada).

## Regras

- Não coloque texto nem botões dentro das imagens.
- Fotos de equipe, fachada e resultados devem ser reais quando apresentadas como trabalho da casa.
- Origem recomendada: 1600–2000 px de largura nas imagens amplas e 1100–1200 px nos retratos.
