# Sistema de Controle de Serviços Extras

Sistema web leve, responsivo e integrado para controle de serviços extras de colaboradores, dividido em **dois ambientes independentes** que compartilham o mesmo banco de dados:

1. **Módulo de Lançamentos – Celular (`/lancamentos` ou `lancamentos.html`):**
   - Tela exclusiva para solicitantes autorizados.
   - Contém apenas os **6 campos obrigatórios** e o botão único **SALVAR LANÇAMENTO**.
   - Permite **cadastrar novo colaborador (Nome + Cargo)** diretamente na tela do celular com 1 toque em `+ Novo Colaborador`.
   - Preenche automaticamente o **Valor do Serviço** cruzando **Empresa + Cargo do Colaborador** na Tabela de Valores, permitindo edição manual quando necessário.
   - Identifica automaticamente o usuário logado como o **Solicitante e Autor** do lançamento.

2. **Módulo Administrativo – ADM (`/adm` ou `adm.html`):**
   - Totalmente adaptado para **celular (tabelas em formato de cards verticais)** e **computador**.
   - Cadastros editáveis de **Tabela de Valores (Empresa + Cargo + Valor)**, **Colaboradores**, **Empresas**, **Cargos** e **Autorizados / Solicitantes (Login e Senha)**.
   - Consulta, edição e cancelamento de lançamentos **mantendo histórico completo de auditoria**.
   - **Fechamentos** semanais, quinzenais ou mensais, com acumulados por colaborador e por empresa.
   - **Recibos individuais** por colaborador e por empresa (gera dois recibos separados automaticamente se o colaborador atuar em duas empresas), com impressão / salvamento em PDF.
   - **Relatórios** exportáveis em **Excel (`.xlsx`)**.
   - **Política de armazenamento de 30 dias** com exportação prévia para Excel e bloqueio automático contra exclusão de pagamentos pendentes ou retenções legais/financeiras.

---

## Acessos Iniciais para Teste (Editáveis no Painel ADM)

- **Painel Administrativo (`/adm`):**
  - **Login:** `admin`
  - **Senha:** `123456`
- **Módulo de Lançamentos Celular (`/lancamentos`):**
  - **Login:** `joao` | **Senha:** `123`
  - **Login:** `maria` | **Senha:** `123`
