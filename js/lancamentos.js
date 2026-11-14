// ============================================================================
// MÓDULO DE LANÇAMENTOS – CELULAR (EXCLUSIVO PARA PESSOAS AUTORIZADAS)
// - Permite cadastrar novo colaborador rapidamente (Nome + Documento + Cargo)
// - Identifica automaticamente o usuário logado como Solicitante do serviço
// - Apenas 6 campos + botão único SALVAR LANÇAMENTO
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("login-view");
  const appView = document.getElementById("lancamento-view");
  const loginForm = document.getElementById("form-login");
  const loginError = document.getElementById("login-error");
  const usuarioLogadoNome = document.getElementById("usuario-logado-nome");
  const btnSair = document.getElementById("btn-sair");

  // Campos do formulário de lançamento (1 a 6)
  const formLancamento = document.getElementById("form-lancamento");
  const selColaborador = document.getElementById("campo-colaborador");
  const infoCargo = document.getElementById("info-cargo-colaborador");
  const selEmpresa = document.getElementById("campo-empresa");
  const inpData = document.getElementById("campo-data");
  const inpMotivo = document.getElementById("campo-motivo");
  const inpValor = document.getElementById("campo-valor");
  const infoValorBadge = document.getElementById("info-valor-badge");
  const feedbackBox = document.getElementById("feedback-lancamento");

  // Cadastro rápido de novo colaborador no celular
  const btnAbrirNovoColab = document.getElementById("btn-abrir-novo-colab");
  const boxNovoColab = document.getElementById("box-novo-colaborador");
  const inpNovoColabNome = document.getElementById("novo-colab-nome");
  const inpNovoColabDoc = document.getElementById("novo-colab-documento");
  const selNovoColabCargo = document.getElementById("novo-colab-cargo");
  const btnSalvarNovoColab = document.getElementById("btn-confirmar-novo-colab");
  const btnCancelarNovoColab = document.getElementById("btn-cancelar-novo-colab");

  let valorAutomaticoAtual = null;

  await window.DB.initDatabase();

  function definirDataHoje() {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, "0");
    const dd = String(hoje.getDate()).padStart(2, "0");
    inpData.value = `${yyyy}-${mm}-${dd}`;
  }

  function carregarOpcoesFormulario(colaboradorSelecionadoId = "") {
    const store = window.DB.loadLocalStore();

    // 1. Colaboradores ativos
    const colabs = store.colaboradores.filter(c => c.ativo !== false);
    selColaborador.innerHTML = `<option value="">Selecione o colaborador...</option>` +
      colabs.map(c => `<option value="${c.id}" data-cargo-id="${c.cargo_id}" data-cargo-nome="${c.cargo_nome}">${c.nome} (${c.cargo_nome})</option>`).join("");

    if (colaboradorSelecionadoId) {
      selColaborador.value = colaboradorSelecionadoId;
    }

    // Cargos para o cadastro rápido de colaborador
    const cargos = store.cargos.filter(c => c.ativo !== false);
    selNovoColabCargo.innerHTML = `<option value="">Selecione o cargo...</option>` +
      cargos.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");

    // 2. Empresas ativas
    const empAtual = selEmpresa.value;
    const empresas = store.empresas.filter(e => e.ativo !== false);
    selEmpresa.innerHTML = `<option value="">Selecione a empresa...</option>` +
      empresas.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
    if (empAtual) selEmpresa.value = empAtual;
  }

  // Cálculo automático do Valor pela Tabela de Valores (Empresa + Cargo)
  function atualizarValorAutomatico() {
    const colabId = selColaborador.value;
    const empresaId = selEmpresa.value;
    const store = window.DB.loadLocalStore();
    const colab = store.colaboradores.find(c => c.id === colabId);

    if (colab) {
      const docTxt = colab.documento ? ` | Doc: ${colab.documento}` : "";
      infoCargo.textContent = `Cargo: ${colab.cargo_nome}${docTxt}`;
      infoCargo.classList.remove("hidden");
    } else {
      infoCargo.classList.add("hidden");
    }

    if (colab && empresaId) {
      const valorTab = window.DB.buscarValorTabela(empresaId, colab.cargo_id);
      valorAutomaticoAtual = valorTab;
      if (valorTab !== null) {
        inpValor.value = valorTab.toFixed(2);
        infoValorBadge.textContent = `Preenchido pela Tabela (${colab.cargo_nome}): R$ ${valorTab.toFixed(2).replace(".", ",")}`;
        infoValorBadge.className = "helper-badge auto";
      } else {
        infoValorBadge.textContent = `Sem valor pré-cadastrado para esta Empresa + Cargo. Informe o valor abaixo.`;
        infoValorBadge.className = "helper-badge manual";
      }
    } else {
      valorAutomaticoAtual = null;
      infoValorBadge.textContent = "Selecione o colaborador e a empresa para preencher automaticamente.";
      infoValorBadge.className = "helper-badge";
    }
  }

  selColaborador.addEventListener("change", atualizarValorAutomatico);
  selEmpresa.addEventListener("change", atualizarValorAutomatico);

  inpValor.addEventListener("input", () => {
    const digitado = parseFloat(inpValor.value);
    if (valorAutomaticoAtual !== null && !isNaN(digitado)) {
      if (Math.abs(digitado - valorAutomaticoAtual) > 0.009) {
        infoValorBadge.textContent = `Valor alterado manualmente (Tabela: R$ ${valorAutomaticoAtual.toFixed(2).replace(".", ",")})`;
        infoValorBadge.className = "helper-badge manual";
      } else {
        infoValorBadge.textContent = `Valor automático da tabela: R$ ${valorAutomaticoAtual.toFixed(2).replace(".", ",")}`;
        infoValorBadge.className = "helper-badge auto";
      }
    }
  });

  // Cadastro rápido de novo colaborador no celular
  btnAbrirNovoColab.addEventListener("click", () => {
    boxNovoColab.classList.toggle("hidden");
    if (!boxNovoColab.classList.contains("hidden")) {
      inpNovoColabNome.focus();
    }
  });

  btnCancelarNovoColab.addEventListener("click", () => {
    boxNovoColab.classList.add("hidden");
    inpNovoColabNome.value = "";
    inpNovoColabDoc.value = "";
    selNovoColabCargo.value = "";
  });

  btnSalvarNovoColab.addEventListener("click", async () => {
    const nome = inpNovoColabNome.value.trim();
    const doc = inpNovoColabDoc.value.trim();
    const cargoId = selNovoColabCargo.value;
    if (!nome) {
      mostrarFeedback("Digite o nome completo do novo colaborador.", "error");
      inpNovoColabNome.focus();
      return;
    }
    if (!doc) {
      mostrarFeedback("Digite o número do documento (CPF / RG) do colaborador.", "error");
      inpNovoColabDoc.focus();
      return;
    }
    if (!cargoId) {
      mostrarFeedback("Selecione o cargo do novo colaborador.", "error");
      selNovoColabCargo.focus();
      return;
    }

    try {
      btnSalvarNovoColab.disabled = true;
      const novo = await window.DB.cadastrarColaboradorRapido(nome, cargoId, doc);
      btnSalvarNovoColab.disabled = false;

      inpNovoColabNome.value = "";
      inpNovoColabDoc.value = "";
      selNovoColabCargo.value = "";
      boxNovoColab.classList.add("hidden");

      carregarOpcoesFormulario(novo.id);
      atualizarValorAutomatico();
      mostrarFeedback(`Colaborador "${novo.nome}" (Doc: ${novo.documento}) cadastrado e selecionado!`, "success");
    } catch (err) {
      btnSalvarNovoColab.disabled = false;
      mostrarFeedback(err.message || "Erro ao cadastrar colaborador.", "error");
    }
  });

  function atualizarTelaPorSessao() {
    const sessao = window.DB.getSessao("LANCADOR");
    if (!sessao) {
      loginView.classList.remove("hidden");
      appView.classList.add("hidden");
    } else {
      loginView.classList.add("hidden");
      appView.classList.remove("hidden");
      usuarioLogadoNome.textContent = sessao.nome;
      definirDataHoje();
      carregarOpcoesFormulario();
    }
  }

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    const login = document.getElementById("login-user").value;
    const senha = document.getElementById("login-pass").value;

    const res = await window.DB.loginUsuario(login, senha, "LANCADOR");
    if (!res.ok) {
      loginError.textContent = res.message;
      loginError.classList.remove("hidden");
      return;
    }
    loginForm.reset();
    atualizarTelaPorSessao();
  });

  btnSair.addEventListener("click", () => {
    window.DB.logout("LANCADOR");
    atualizarTelaPorSessao();
  });

  formLancamento.addEventListener("submit", async (e) => {
    e.preventDefault();
    feedbackBox.classList.add("hidden");

    const sessao = window.DB.getSessao("LANCADOR");
    if (!sessao) {
      atualizarTelaPorSessao();
      return;
    }

    const turnoChecked = document.querySelector('input[name="turno"]:checked');
    if (!turnoChecked) {
      mostrarFeedback("Selecione o turno (Manhã, Tarde ou Noite).", "error");
      return;
    }

    const valorNum = parseFloat(String(inpValor.value).replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      mostrarFeedback("Informe um valor válido para o serviço.", "error");
      return;
    }

    try {
      const btnSubmit = document.getElementById("btn-salvar-lancamento");
      btnSubmit.disabled = true;
      btnSubmit.textContent = "SALVANDO...";

      await window.DB.criarLancamento(
        {
          colaborador_id: selColaborador.value,
          empresa_id: selEmpresa.value,
          data_trabalho: inpData.value,
          turno: turnoChecked.value,
          motivo: inpMotivo.value,
          valor: valorNum
        },
        sessao
      );

      btnSubmit.disabled = false;
      btnSubmit.textContent = "SALVAR LANÇAMENTO";

      const dataMantida = inpData.value;
      formLancamento.reset();
      inpData.value = dataMantida;
      infoCargo.classList.add("hidden");
      infoValorBadge.textContent = "Selecione o colaborador e a empresa para preencher automaticamente.";
      infoValorBadge.className = "helper-badge";

      mostrarFeedback("Lançamento registrado com sucesso!", "success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const btnSubmit = document.getElementById("btn-salvar-lancamento");
      btnSubmit.disabled = false;
      btnSubmit.textContent = "SALVAR LANÇAMENTO";
      mostrarFeedback(err.message || "Erro ao salvar lançamento.", "error");
    }
  });

  function mostrarFeedback(msg, tipo) {
    feedbackBox.textContent = msg;
    feedbackBox.className = `toast-feedback ${tipo}`;
    feedbackBox.classList.remove("hidden");
    if (tipo === "success") {
      setTimeout(() => {
        feedbackBox.classList.add("hidden");
      }, 4500);
    }
  }

  atualizarTelaPorSessao();
});
