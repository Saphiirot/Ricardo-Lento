# Vérto — Quiropraxia & Massagem (projeto conceptual)

Projeto conceptual desenvolvido pela **ConectaWeb**. Marca, contactos, testemunhos e restantes conteúdos são **fictícios** e servem apenas para fins demonstrativos.

Site estático com 4 páginas e motor 3D próprio (Three.js + GSAP + Lenis, todos incluídos em `site/vendor/`, sem dependências externas além do Google Fonts).

```
site/                 ← pasta publicada
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
```

## Editar conteúdo
1. Editar `src/pages/<pagina>.html` (ou a marca/contactos em `BUSINESS` dentro de `src/build.py`).
2. Correr `python3 src/build.py`.

## Pré-visualizar localmente
```bash
python3 -m http.server 4173 --directory site
```

## Notas
- As páginas têm `noindex, nofollow`: uma clínica fictícia não deve aparecer nos motores de busca como se fosse real.
- Os botões de WhatsApp abrem `wa.me/?text=…` sem número, para não apontarem para nenhum contacto real.
- `SITE_URL` em `src/build.py` está vazio; preencher com o domínio do portfólio para ativar `canonical` e `og:url`.
- Fotografias: Unsplash (Unsplash License, uso comercial gratuito, sem atribuição obrigatória).
