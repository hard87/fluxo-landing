# Landing comercial do Fluxo

Site estático independente criado para publicação em `fluxo.officina404.com.br`.

## Visualizar localmente

Na raiz do repositório:

```powershell
python -m http.server 4174 --directory marketing-site
```

Abra `http://127.0.0.1:4174`.

## Publicação

Os arquivos desta pasta podem ser publicados diretamente na raiz do subdomínio, sem etapa de build:

- `index.html`, `styles.css` e `script.js`;
- `img/` (capturas do portal com dados demonstrativos e imagens do R1);
- `og-image.jpg`, `robots.txt` e `sitemap.xml`.

Antes da publicação definitiva, confirme:

1. o apontamento DNS e HTTPS de `fluxo.officina404.com.br`;
2. o formulário de piloto monta um e-mail para `contato@officina404.com.br` (`mailto`); se for trocado por agenda ou backend de leads, ajustar `script.js`;
3. a URL pública do portal, caso seja incluído um botão separado de acesso;
4. a imagem Open Graph, quando houver um arquivo de marca definitivo.

## Responsabilidade das páginas

- esta landing apresenta valor, aplicações, oferta modular e conversão;
- `officina404.com.br/projetos/fluxo.html` preserva história, evidências e diário técnico;
- o portal continua responsável por autenticação e operação do produto.

A landing não exibe métricas de clientes. As telas são do portal real com dados demonstrativos, e o R1 aparece identificado como protótipo de bancada e conceito de gabinete.

O histórico das versões anteriores fica fora do GitHub, em `D:\Officina404\_arquivo\fluxo\landing-page`.

