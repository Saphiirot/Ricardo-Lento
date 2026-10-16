# Ricardo Lento — website (piloto)

Site estático com 4 páginas e motor 3D próprio (Three.js + GSAP + Lenis, todos incluídos em `site/vendor/`, sem dependências externas além do Google Fonts).

```
site/                 ← pasta publicada na Vercel
  index.html          Início — coluna 3D que se alinha com o scroll, mapa da dor, morph para o logótipo
  tratamentos.html    Tratamentos — vértebras em vista explodida
  desporto.html       Desporto & Performance — coluna em movimento
  sobre.html          Sobre & Contacto — logótipo em partículas + construtor de mensagem WhatsApp
  assets/js/spine3d.js   motor 3D (4 modos)
  assets/js/main.js      interações (scroll, reveals, carrossel, mapa da dor, WhatsApp)
  assets/css/style.css   design system
src/
  pages/*.html        conteúdo de cada página (editar aqui)
  build.py            monta cabeçalho/rodapé/SEO → gera site/*.html
entregas/
  PROMPTS-CHATGPT.md  prompts para melhorar logótipo e fotos
  fotos-para-melhorar/
referencias/ANALISE.md  análise das redes do cliente
```

## Editar conteúdo
1. Editar `src/pages/<pagina>.html` (ou contactos em `BUSINESS` dentro de `src/build.py`).
2. Correr `python3 src/build.py`.

## Pré-visualizar localmente
```bash
python3 -m http.server 4173 --directory site
```

## Publicar na Vercel
```bash
cd site && npx vercel --prod
```
(Na primeira vez pede login e o nome do projeto. Framework: "Other", sem build command, output = pasta atual.)
Depois, em Vercel → Settings → Domains, ligar `ricardolento.pt`.

## Substituir imagens
Mesmo nome de ficheiro em `site/assets/img/` → o site usa automaticamente. Ver `entregas/PROMPTS-CHATGPT.md`.

## Pendentes para a versão final
- Ficheiro original do logótipo (vetor) — por agora usa a versão do Instagram tratada com fundo transparente.
- Fotografias profissionais do Ricardo e do consultório.
- Valores das consultas (atualmente "mediante avaliação").
- Horário completo.
- Fotos de stock (Unsplash, licença livre): quiropraxia, massagens, trail, ciclismo.
