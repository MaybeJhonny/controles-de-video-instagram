# IG Controles Extra

Extensão para Chromium (Brave, Chrome, Edge) que adiciona controles de vídeo ao Instagram Web — os que o Instagram não oferece: barra de tempo, volume com memória, rotação e tela cheia com player clássico.

## Recursos

- **Barra de tempo (seek)** contínua, quadro a quadro, para pular para qualquer ponto do vídeo.
- **Volume de 0 a 100%** lembrado entre os vídeos (você define uma vez e vale para os próximos).
- **Rotação** de 90° para a esquerda e para a direita, para vídeos gravados deitados.
- **Tela cheia** com player clássico próprio (barra preta com play, tempo, progresso, volume e girar). Vídeo vertical rotacionado ocupa a altura inteira do monitor.
- A barra aparece **sobre cada vídeo visível** e some nos slides escondidos de carrossel.
- O botão de áudio nativo do Instagram continua acessível (o mudo fica por conta dele).

## Instalação (modo desenvolvedor)

1. Baixe ou clone este repositório numa pasta fixa.
2. Abra `brave://extensions` (ou `chrome://extensions`).
3. Ative o **Modo de desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta do projeto.
5. Abra o Instagram e a barra aparece nos vídeos.

## Estrutura

- `manifest.json` — configuração da extensão (Manifest V3).
- `content.js` — lógica dos controles injetados no Instagram.
- `styles.css` — estilos das barras.

## Observações

- Testado no Instagram Web em navegadores Chromium.
- A tela cheia esconde os overlays do Instagram para mostrar só o vídeo e a barra.
- Projeto pessoal, sem coleta de dados. Roda 100% local no navegador.

## Licença

MIT. Veja [LICENSE](LICENSE).
