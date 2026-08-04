# IG Controles Extra

Extensao para Chromium (Brave, Chrome, Edge) que adiciona controles de video ao Instagram Web: barra de tempo, volume com memoria, rotacao e tela cheia com player classico.

## Recursos

- Barra de tempo (seek) continua, quadro a quadro, para pular para qualquer ponto do video.
- Volume de 0 a 100% lembrado entre os videos.
- Rotacao de 90 graus para a esquerda e para a direita, para videos gravados deitados.
- Tela cheia com player classico proprio. Video vertical rotacionado ocupa a altura inteira do monitor.
- A barra aparece sobre cada video visivel e some nos slides escondidos de carrossel.
- O botao de audio nativo do Instagram continua acessivel.

## Instalacao (modo desenvolvedor)

1. Baixe ou clone este repositorio numa pasta fixa.
2. Abra brave://extensions (ou chrome://extensions).
3. Ative o Modo de desenvolvedor.
4. Clique em Carregar sem compactacao e selecione a pasta do projeto.
5. Abra o Instagram e a barra aparece nos videos.

## Estrutura

- manifest.json - configuracao da extensao (Manifest V3).
- content.js - logica dos controles injetados no Instagram.
- styles.css - estilos das barras.

## Observacoes

Projeto pessoal, sem coleta de dados. Roda 100% local no navegador.

## Licenca

MIT. Veja o arquivo LICENSE.
