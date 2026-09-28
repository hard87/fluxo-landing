# Landing comercial do Fluxo

Site estático independente criado para publicação em `fluxo.officina404.com.br`.

## Visualizar localmente

Na raiz do repositório:

```powershell
python -m http.server 4174 --directory marketing-site
```

Abra `http://127.0.0.1:4174`.

## Publicação

Os três arquivos desta pasta podem ser publicados diretamente na raiz do subdomínio, sem etapa de build:

- `index.html`
- `styles.css`
- `script.js`

Antes da publicação definitiva, confirme:

1. o apontamento DNS e HTTPS de `fluxo.officina404.com.br`;
2. se o CTA principal continuará usando `contato@officina404.com.br` ou apontará para agenda/formulário;
3. a URL pública do portal, caso seja incluído um botão separado de acesso;
4. a imagem Open Graph, quando houver um arquivo de marca definitivo.

## Responsabilidade das páginas

- esta landing apresenta valor, aplicações, oferta modular e conversão;
- `officina404.com.br/projetos/fluxo.html` preserva história, evidências e diário técnico;
- o portal continua responsável por autenticação e operação do produto.

As métricas exibidas na landing são identificadas como resultados de cenários controlados e derivam das evidências registradas no repositório.
