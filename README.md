# Gerenciador de Produtos Bling ERP v3

Esta é uma aplicação web completa e moderna para monitoramento, controle de estoque e alteração de preços usando a mais nova **API v3 do Bling ERP**. Desenvolvida com **Node.js, Express, React e Tailwind CSS**, ela foi arquitetada de forma a separar com segurança o backend (protegendo credenciais) e o frontend (fornecendo uma interface responsiva, elegante e com suporte a modo escuro).

---

## 📂 Estrutura do Projeto

Para compatibilidade total com os sistemas de conteinerização do Cloud Run e servidores corporativos, o projeto está estruturado de forma unificada (Fullstack Proxy):

*   **`/server.ts`** (Backend): Servidor Node.js Express de alta performance que se conecta à API oficial do Bling v3, processa cache local, gerencia logs de erros detalhados e expõe endpoints seguros.
*   **`/src`** (Frontend): Interface do usuário moderna baseada em React e estilizada com Tailwind CSS.
*   **`/package.json`**: Gerenciador de dependências e comandos de compilação.
*   **`/.env.example`**: Arquivo explicativo para variáveis de ambiente locais.

---

## 🛠️ Como Instalar e Rodar Localmente

Adicione as etapas abaixo no terminal do seu ambiente de desenvolvimento:

### 1. Requisitos Prévios
Certifique-se de ter o **Node.js (v18 ou superior)** instalado na sua máquina.

### 2. Instalação das Dependências
Navegue até a pasta raiz e execute o instalador do Node:
```bash
npm install
```

### 3. Executando em Modo de Desenvolvimento (Hot-reload)
Para iniciar ambos, o servidor de backend Express e o compilador frontend Vite em paralelo:
```bash
npm run dev
```
O aplicativo estará disponível imediatamente em: **`http://localhost:3000`**

### 4. Compilando e Rodando em Produção (Build Otimizado)
Compile o servidor a nível ESM com bundling de esbuild e o frontend estático:
```bash
npm run build
npm start
```

---

## 🔑 Como Obter o Access Token do Bling v3

Diferente da antiga API v2 do Bling (que usava API Keys fixas), a **API v3 do Bling** utiliza autorização moderna via protocolo **OAuth 2.0 (Bearer Access Tokens)**.

Siga os passos abaixo para gerar um token válido para o gerenciador:

1.  Acesse o seu portal do **Bling ERP** com usuário administrador.
2.  No menu superior, vá em **Preferências (Engrenagem) &gt; Sistemas &gt; Integrações &gt; Configurações de Integrações**.
3.  Crie uma nova integração de desenvolvedor clicando em **Cadastrar aplicativo** ou usando a interface do **Apps do Bling**.
4.  Configure as credenciais e dê autorização com escopos mínimos de leitura e escrita para as entidades de:
    *   `produtos` (leitura e escrita)
    *   `estoques` (leitura e escrita)
    *   `depositos` (leitura)
5.  Clique em **Autorizar** ou de acordo com as instruções da sandbox de desenvolvedores do Bling para emitir um **Access Token** em formato de hash (geralmente se inicia com `Bearer` ou tem vigência padrão de 2 horas ou renovação automatizada).
6.  Copie o token gerado e cole diretamente na tela inicial de conexão da aplicação!

---

## ⚠️ Diagnóstico e Resolução de Erros Comuns

O aplicativo possui uma **janela de Logs de Sistema** bem no final da página que renderiza em tempo real as respostas cruas recebidas do Bling.

Abaixo estão as soluções para os erros mais frequentes mapeados pelo sistema:

1.  **Erro `401 Unauthorized` (Log de Sistema vermelho):**
    *   *Causa:* O token de acesso expirou (a vigência do token de homologação do Bling é de 2h) ou o token colado está incompleto.
    *   *Solução:* Gere um novo access_token atualizado no Bling e faça o login novamente.
2.  **Erro `403 Forbidden` ou escopo ausente:**
    *   *Causa:* Seu aplicativo do Bling não recebeu permissão para ler ou gravar na entidade de Produtos ou Estoque.
    *   *Solução:* No app criado no Bling, altere as permissões (escopos) de segurança do aplicativo marcando as caixas correspondentes a Produtos e Estoques.
3.  **Erro ao Atualizar Estoque (Nenhum Depósito Encontrado):**
    *   *Causa:* Para realizar o balanço ou entrada de estoque no Bling, é obrigatório passar o ID de um Depósito Físico. O aplicativo busca dinamicamente o primeiro depósito. Se falhar, verifique se você possui ao menos 1 depósito padrão cadastrado em seu painel Bling.
    *   *Solução:* Vá em Preferências do Bling &gt; Cadastros &gt; Depósitos de Estoque e garanta que haja pelo menos 1 depósito ativo cadastrado.
