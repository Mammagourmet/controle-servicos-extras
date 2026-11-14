// ============================================================================
// MÓDULO ADMINISTRATIVO (ADM) - LÓGICA COMPLETA (RESPONSIVO CELULAR E PC)
// Inclui Relatório Analítico Completo em PDF Formato Paisagem + Excel (.xlsx)
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("adm-login-view");
  const appView = document.getElementById("adm-app-view");
  const formLogin = document.getElementById("form-adm-login");
  const loginError = document.getElementById("adm-login-error");
  const admUserName = document.getElementById("adm-user-name");
  const badgeCloudStatus = document.getElementById("badge-cloud-status");

  let backup30dRealizado = false;

  const connStatus = await window.DB.initDatabase();
  atualizarStatusNuvem(connStatus.connected);

  function atualizarStatusNuvem(connected) {
    if (connected || window.DB.isCloud()) {
      badgeCloudStatus.textContent = "Supabase Online (Sincronizado)";
      badgeCloudStatus.className = "cloud-badge online";
    } else {
      badgeCloudStatus.textContent = "Armazenamento Local (Pronto p/ Nuvem)";
      badgeCloudStatus.className = "cloud-badge local";
    }
  }

  function formatMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function formatDataBR(isoDate) {
    if (!isoDate) return "-";
    const parts = String(isoDate).slice(0, 10).split("-");
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatDataHoraBR(isoStr) {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString("pt-BR");
  }

  function obterDocumentoColaborador(colaboradorId) {
    const store = window.DB.loadLocalStore();
    const c = store.colaboradores.find(x => x.id === colaboradorId);
    return (c && c.documento) ? c.documento : "-";
  }

  // ==========================================================================
  // SESSÃO E NAVEGAÇÃO DE ABAS
  // ==========================================================================
  function verificarSessaoAdm() {
    const sessao = window.DB.getSessao("ADM");
    if (!sessao) {
      loginView.classList.remove("hidden");
      appView.classList.add("hidden");
    } else {
      loginView.classList.add("hidden");
      appView.classList.remove("hidden");
      admUserName.textContent = `${sessao.nome} (${sessao.login})`;
      carregarTudoAdm();
    }
  }

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");
    const login = document.getElementById("adm-user").value;
    const senha = document.getElementById("adm-pass").value;

    const res = await window.DB.loginUsuario(login, senha, "ADM");
    if (!res.ok) {
      loginError.textContent = res.message;
      loginError.classList.remove("hidden");
      return;
    }
    formLogin.reset();
    verificarSessaoAdm();
  });

  document.getElementById("btn-adm-logout").addEventListener("click", () => {
    window.DB.logout("ADM");
    verificarSessaoAdm();
  });

  document.getElementById("btn-sync-now").addEventListener("click", async () => {
    if (window.DB.isCloud()) {
      await window.DB.pullAllFromCloud();
    }
    carregarTudoAdm();
  });

  document.querySelectorAll(".adm-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".adm-tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".adm-tab-pane").forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.remove("hidden");
      carregarTudoAdm();
    });
  });

  document.querySelectorAll(".cad-subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cad-subtab-btn").forEach(b => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-outline");
      });
      document.querySelectorAll(".cad-subpane").forEach(p => p.classList.add("hidden"));
      btn.classList.remove("btn-outline");
      btn.classList.add("btn-primary");
      const pane = document.getElementById(btn.dataset.subtab);
      if (pane) pane.classList.remove("hidden");
    });
  });

  function carregarTudoAdm() {
    popularSelectsDeFiltrosECadastros();
    renderAbaLancamentos();
    renderAbaFechamentos();
    renderAbaRecibos();
    renderAbaRelatorios();
    renderAbaCadastros();
    renderAbaArmazenamento();
  }

  function popularSelectsDeFiltrosECadastros() {
    const store = window.DB.loadLocalStore();

    const opcoesEmpresas = `<option value="">Todas as empresas</option>` +
      store.empresas.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
    const opcoesColabs = `<option value="">Todos os colaboradores</option>` +
      store.colaboradores.map(c => `<option value="${c.id}">${c.nome} (${c.cargo_nome})</option>`).join("");

    ["filtro-empresa", "fech-empresa", "rec-empresa", "rel-empresa"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = el.value;
      el.innerHTML = opcoesEmpresas;
      el.value = val;
    });

    ["filtro-colaborador", "rec-colaborador", "rel-colaborador"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = el.value;
      el.innerHTML = opcoesColabs;
      el.value = val;
    });

    const valEmp = document.getElementById("val-empresa");
    if (valEmp) {
      const curr = valEmp.value;
      valEmp.innerHTML = `<option value="">Selecione a empresa...</option>` +
        store.empresas.filter(e => e.ativo !== false).map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
      valEmp.value = curr;
    }

    const opcoesCargos = `<option value="">Selecione o cargo...</option>` +
      store.cargos.filter(c => c.ativo !== false).map(c => `<option value="${c.id}">${c.nome}</option>`).join("");

    ["val-cargo", "col-cargo"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const curr = el.value;
      el.innerHTML = opcoesCargos;
      el.value = curr;
    });

    document.getElementById("edit-lnc-colaborador").innerHTML =
      store.colaboradores.map(c => `<option value="${c.id}">${c.nome} (${c.cargo_nome})</option>`).join("");
    document.getElementById("edit-lnc-empresa").innerHTML =
      store.empresas.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
  }

  // ==========================================================================
  // ABA 1: CONSULTAR E GERENCIAR LANÇAMENTOS
  // ==========================================================================
  function obterLancamentosFiltradosAba1() {
    const store = window.DB.loadLocalStore();
    const dtIni = document.getElementById("filtro-data-ini").value;
    const dtFim = document.getElementById("filtro-data-fim").value;
    const empId = document.getElementById("filtro-empresa").value;
    const colId = document.getElementById("filtro-colaborador").value;
    const stPag = document.getElementById("filtro-pagamento").value;
    const stSit = document.getElementById("filtro-situacao").value;

    return store.lancamentos
      .filter(l => {
        if (dtIni && l.data_trabalho < dtIni) return false;
        if (dtFim && l.data_trabalho > dtFim) return false;
        if (empId && l.empresa_id !== empId) return false;
        if (colId && l.colaborador_id !== colId) return false;
        if (stPag !== "TODOS" && l.status_pagamento !== stPag) return false;
        if (stSit !== "TODOS" && l.status_lancamento !== stSit) return false;
        return true;
      })
      .sort((a, b) => (b.data_trabalho || "").localeCompare(a.data_trabalho || ""));
  }

  function renderAbaLancamentos() {
    const lista = obterLancamentosFiltradosAba1();
    const ativos = lista.filter(l => l.status_lancamento === "ATIVO");
    const pendentes = ativos.filter(l => l.status_pagamento === "PENDENTE");
    const pagos = ativos.filter(l => l.status_pagamento === "PAGO");

    const somaGeral = ativos.reduce((acc, l) => acc + Number(l.valor || 0), 0);
    const somaPend = pendentes.reduce((acc, l) => acc + Number(l.valor || 0), 0);
    const somaPago = pagos.reduce((acc, l) => acc + Number(l.valor || 0), 0);

    document.getElementById("kpi-total-geral").textContent = formatMoeda(somaGeral);
    document.getElementById("kpi-qtd-geral").textContent = `${ativos.length} serviços ativos`;
    document.getElementById("kpi-total-pendente").textContent = formatMoeda(somaPend);
    document.getElementById("kpi-qtd-pendente").textContent = `${pendentes.length} pendentes`;
    document.getElementById("kpi-total-pago").textContent = formatMoeda(somaPago);
    document.getElementById("kpi-qtd-pago").textContent = `${pagos.length} pagos`;

    const tbody = document.getElementById("tbody-lancamentos");
    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:24px; color:#64748b;">Nenhum lançamento encontrado para os filtros selecionados.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(l => {
      const cancelado = l.status_lancamento === "CANCELADO";
      const pago = l.status_pagamento === "PAGO";
      const nomeSolicitante = l.lancado_por_nome || l.solicitante_nome || "-";
      const docColab = obterDocumentoColaborador(l.colaborador_id);
      return `
        <tr style="${cancelado ? "opacity:0.6; background:#fef2f2;" : ""}">
          <td data-label="Data"><strong>${formatDataBR(l.data_trabalho)}</strong></td>
          <td data-label="Colaborador">
            <div>
              <strong>${l.colaborador_nome}</strong>
              <div style="font-size:0.76rem; color:#64748b;">${l.cargo_nome || "-"} | Doc: ${docColab}</div>
            </div>
          </td>
          <td data-label="Empresa">${l.empresa_nome}</td>
          <td data-label="Turno">${l.turno}</td>
          <td data-label="Motivo">${l.motivo}</td>
          <td data-label="Solicitante">
            <div>
              <strong>${nomeSolicitante}</strong>
              <div style="font-size:0.74rem; color:#64748b;">${formatDataHoraBR(l.criado_em)}</div>
            </div>
          </td>
          <td data-label="Valor">
            <div>
              <strong>${formatMoeda(l.valor)}</strong>
              ${l.valor_alterado_manual ? `<div style="font-size:0.7rem; color:#b45309;">Manual (Tab: ${formatMoeda(l.valor_tabela)})</div>` : ""}
            </div>
          </td>
          <td data-label="Pagamento">
            <div>
              <span class="status-pill ${pago ? "pago" : "pendente"}">${l.status_pagamento}</span>
              ${l.data_pagamento ? `<div style="font-size:0.7rem; color:#64748b;">${formatDataBR(l.data_pagamento)}</div>` : ""}
            </div>
          </td>
          <td data-label="Situação">
            <span class="status-pill ${cancelado ? "cancelado" : "ativo"}">${l.status_lancamento}</span>
          </td>
          <td data-label="Ações">
            <div style="display:flex; gap:5px; flex-wrap:wrap; justify-content:flex-end;">
              ${!cancelado ? `
                <button type="button" class="btn btn-sm ${pago ? "btn-outline" : "btn-success"}" data-action="toggle-pag" data-id="${l.id}">
                  ${pago ? "Voltar Pendente" : "Marcar Pago"}
                </button>
                <button type="button" class="btn btn-sm btn-outline" data-action="editar" data-id="${l.id}">Editar</button>
                <button type="button" class="btn btn-sm btn-danger" data-action="cancelar" data-id="${l.id}">Cancelar</button>
              ` : `
                <button type="button" class="btn btn-sm btn-outline" data-action="reativar" data-id="${l.id}">Reativar</button>
              `}
              <button type="button" class="btn btn-sm btn-outline" data-action="historico" data-id="${l.id}">
                Histórico (${Array.isArray(l.historico) ? l.historico.length : 1})
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  ["filtro-data-ini", "filtro-data-fim", "filtro-empresa", "filtro-colaborador", "filtro-pagamento", "filtro-situacao"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderAbaLancamentos);
  });

  document.getElementById("tbody-lancamentos").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    const sessao = window.DB.getSessao("ADM");
    const store = window.DB.loadLocalStore();
    const item = store.lancamentos.find(l => l.id === id);
    if (!item) return;

    if (action === "toggle-pag") {
      const novoSt = item.status_pagamento === "PAGO" ? "PENDENTE" : "PAGO";
      await window.DB.alterarStatusPagamento([id], novoSt, "", sessao);
      carregarTudoAdm();
    } else if (action === "editar") {
      abrirModalEditar(item);
    } else if (action === "cancelar") {
      const motivo = prompt("Informe o motivo do cancelamento (ficará registrado no histórico):", "Lançamento duplicado ou cancelado");
      if (motivo === null) return;
      await window.DB.alterarStatusLancamento(id, "CANCELADO", motivo, sessao);
      carregarTudoAdm();
    } else if (action === "reativar") {
      await window.DB.alterarStatusLancamento(id, "ATIVO", "Reativado pelo Administrador", sessao);
      carregarTudoAdm();
    } else if (action === "historico") {
      abrirModalHistorico(item);
    }
  });

  document.getElementById("btn-quitar-selecionados").addEventListener("click", async () => {
    const pendentes = obterLancamentosFiltradosAba1().filter(
      l => l.status_lancamento === "ATIVO" && l.status_pagamento === "PENDENTE"
    );
    if (pendentes.length === 0) {
      alert("Não há lançamentos pendentes na lista filtrada atual.");
      return;
    }
    if (!confirm(`Deseja marcar todos os ${pendentes.length} lançamentos pendentes filtrados como PAGO?`)) return;
    const sessao = window.DB.getSessao("ADM");
    await window.DB.alterarStatusPagamento(pendentes.map(p => p.id), "PAGO", "Quitação em Lote", sessao);
    carregarTudoAdm();
  });

  document.getElementById("btn-export-lancamentos-xlsx").addEventListener("click", () => {
    const lista = obterLancamentosFiltradosAba1();
    exportarParaExcel(
      lista.map(l => ({
        Data: formatDataBR(l.data_trabalho),
        Colaborador: l.colaborador_nome,
        Documento: obterDocumentoColaborador(l.colaborador_id),
        Cargo: l.cargo_nome,
        Empresa: l.empresa_nome,
        Turno: l.turno,
        Motivo: l.motivo,
        "Solicitante / Lançado Por": l.lancado_por_nome || l.solicitante_nome,
        "Valor (R$)": Number(l.valor),
        "Status Pagamento": l.status_pagamento,
        "Situação": l.status_lancamento
      })),
      "Lancamentos_Filtrados",
      "lancamentos_servicos_extras.xlsx"
    );
  });

  // Modal de Edição e Histórico
  const modalEditar = document.getElementById("modal-editar-lancamento");
  const modalHistorico = document.getElementById("modal-historico");

  function abrirModalEditar(l) {
    document.getElementById("edit-lnc-id").value = l.id;
    document.getElementById("edit-lnc-colaborador").value = l.colaborador_id;
    document.getElementById("edit-lnc-empresa").value = l.empresa_id;
    document.getElementById("edit-lnc-data").value = l.data_trabalho;
    document.getElementById("edit-lnc-turno").value = l.turno;
    document.getElementById("edit-lnc-valor").value = Number(l.valor).toFixed(2);
    document.getElementById("edit-lnc-motivo").value = l.motivo;
    document.getElementById("edit-lnc-conservar").checked = Boolean(l.conservar_legal);
    document.getElementById("edit-lnc-justificativa").value = "";
    modalEditar.classList.remove("hidden");
  }

  document.getElementById("btn-fechar-modal-editar").addEventListener("click", () => {
    modalEditar.classList.add("hidden");
  });

  document.getElementById("form-editar-lancamento").addEventListener("submit", async (e) => {
    e.preventDefault();
    const sessao = window.DB.getSessao("ADM");
    const id = document.getElementById("edit-lnc-id").value;
    await window.DB.editarLancamento(
      id,
      {
        colaborador_id: document.getElementById("edit-lnc-colaborador").value,
        empresa_id: document.getElementById("edit-lnc-empresa").value,
        data_trabalho: document.getElementById("edit-lnc-data").value,
        turno: document.getElementById("edit-lnc-turno").value,
        valor: parseFloat(document.getElementById("edit-lnc-valor").value),
        motivo: document.getElementById("edit-lnc-motivo").value,
        conservar_legal: document.getElementById("edit-lnc-conservar").checked
      },
      document.getElementById("edit-lnc-justificativa").value,
      sessao
    );
    modalEditar.classList.add("hidden");
    carregarTudoAdm();
  });

  function abrirModalHistorico(l) {
    const hist = Array.isArray(l.historico) ? l.historico : [];
    const container = document.getElementById("conteudo-historico");
    container.innerHTML = hist.map(h => `
      <div style="padding:10px 12px; border:1px solid #e2e8f0; border-radius:8px; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#475569;">
          <strong>${h.acao}</strong>
          <span>${formatDataHoraBR(h.data)}</span>
        </div>
        <div style="font-size:0.85rem; margin-top:4px;"><strong>Usuário:</strong> ${h.usuario}</div>
        <div style="font-size:0.85rem; color:#0f172a; margin-top:2px;">${h.detalhes}</div>
      </div>
    `).join("");
    modalHistorico.classList.remove("hidden");
  }

  document.getElementById("btn-fechar-modal-historico").addEventListener("click", () => {
    modalHistorico.classList.add("hidden");
  });

  // ==========================================================================
  // ABA 2: FECHAMENTOS (SEMANAL, QUINZENAL, MENSAL) E VALORES ACUMULADOS
  // ==========================================================================
  document.querySelectorAll("[data-periodo]").forEach(btn => {
    btn.addEventListener("click", () => {
      const hoje = new Date();
      const yyyy = hoje.getFullYear();
      const mm = String(hoje.getMonth() + 1).padStart(2, "0");
      const ultimoDiaMes = new Date(yyyy, hoje.getMonth() + 1, 0).getDate();
      const tipo = btn.dataset.periodo;

      const inpIni = document.getElementById("fech-data-ini");
      const inpFim = document.getElementById("fech-data-fim");
      const inpRef = document.getElementById("fech-referencia");

      if (tipo === "SEMANA_ATUAL") {
        const diaSemana = hoje.getDay();
        const diffSeg = hoje.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
        const seg = new Date(hoje.setDate(diffSeg));
        const dom = new Date(seg);
        dom.setDate(seg.getDate() + 6);
        inpIni.value = seg.toISOString().slice(0, 10);
        inpFim.value = dom.toISOString().slice(0, 10);
        inpRef.value = `Fechamento Semanal (${formatDataBR(inpIni.value)} a ${formatDataBR(inpFim.value)})`;
      } else if (tipo === "QUINZENA_1") {
        inpIni.value = `${yyyy}-${mm}-01`;
        inpFim.value = `${yyyy}-${mm}-15`;
        inpRef.value = `1ª Quinzena ${mm}/${yyyy}`;
      } else if (tipo === "QUINZENA_2") {
        inpIni.value = `${yyyy}-${mm}-16`;
        inpFim.value = `${yyyy}-${mm}-${String(ultimoDiaMes).padStart(2, "0")}`;
        inpRef.value = `2ª Quinzena ${mm}/${yyyy}`;
      } else if (tipo === "MES_ATUAL") {
        inpIni.value = `${yyyy}-${mm}-01`;
        inpFim.value = `${yyyy}-${mm}-${String(ultimoDiaMes).padStart(2, "0")}`;
        inpRef.value = `Fechamento Mensal ${mm}/${yyyy}`;
      } else {
        inpIni.value = "";
        inpFim.value = "";
        inpRef.value = "Fechamento Geral";
      }
      renderAbaFechamentos();
    });
  });

  ["fech-data-ini", "fech-data-fim", "fech-empresa"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderAbaFechamentos);
  });

  function renderAbaFechamentos() {
    const store = window.DB.loadLocalStore();
    const dtIni = document.getElementById("fech-data-ini").value;
    const dtFim = document.getElementById("fech-data-fim").value;
    const empId = document.getElementById("fech-empresa").value;

    const ativos = store.lancamentos.filter(l => {
      if (l.status_lancamento !== "ATIVO") return false;
      if (dtIni && l.data_trabalho < dtIni) return false;
      if (dtFim && l.data_trabalho > dtFim) return false;
      if (empId && l.empresa_id !== empId) return false;
      return true;
    });

    const mapColab = new Map();
    for (const l of ativos) {
      if (!mapColab.has(l.colaborador_id)) {
        mapColab.set(l.colaborador_id, {
          id: l.colaborador_id,
          nome: l.colaborador_nome,
          cargo: l.cargo_nome,
          doc: obterDocumentoColaborador(l.colaborador_id),
          qtd: 0,
          pendente: 0,
          pago: 0,
          total: 0,
          idsPendentes: [],
          idsPagos: []
        });
      }
      const g = mapColab.get(l.colaborador_id);
      const v = Number(l.valor || 0);
      g.qtd += 1;
      g.total += v;
      if (l.status_pagamento === "PAGO") {
        g.pago += v;
        g.idsPagos.push(l.id);
      } else {
        g.pendente += v;
        g.idsPendentes.push(l.id);
      }
    }

    const tbodyCol = document.getElementById("tbody-acumulado-colaborador");
    const arrColab = Array.from(mapColab.values()).sort((a, b) => b.total - a.total);
    tbodyCol.innerHTML = arrColab.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding:18px; color:#64748b;">Sem lançamentos ativos no período selecionado.</td></tr>`
      : arrColab.map(c => `
        <tr>
          <td data-label="Colaborador"><strong>${c.nome}</strong></td>
          <td data-label="Cargo / Doc">${c.cargo} <span style="font-size:0.76rem; color:#64748b;">(Doc: ${c.doc})</span></td>
          <td data-label="Qtd. Serviços">${c.qtd}</td>
          <td data-label="Pendente" style="color:#b45309; font-weight:700;">${formatMoeda(c.pendente)}</td>
          <td data-label="Pago" style="color:#15803d; font-weight:700;">${formatMoeda(c.pago)}</td>
          <td data-label="Total Acumulado"><strong>${formatMoeda(c.total)}</strong></td>
          <td data-label="Ações">
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
              ${c.idsPendentes.length > 0 ? `
                <button type="button" class="btn btn-sm btn-success" data-fech-colab-pagar="${c.id}">
                  Marcar PAGO (${c.idsPendentes.length})
                </button>
              ` : ""}
              ${c.idsPagos.length > 0 ? `
                <button type="button" class="btn btn-sm btn-outline" data-fech-colab-pendente="${c.id}">
                  Reabrir Pendente
                </button>
              ` : ""}
            </div>
          </td>
        </tr>
      `).join("");

    const mapEmp = new Map();
    for (const l of ativos) {
      if (!mapEmp.has(l.empresa_id)) {
        mapEmp.set(l.empresa_id, {
          id: l.empresa_id,
          nome: l.empresa_nome,
          qtd: 0,
          pendente: 0,
          pago: 0,
          total: 0,
          idsPendentes: [],
          idsPagos: []
        });
      }
      const g = mapEmp.get(l.empresa_id);
      const v = Number(l.valor || 0);
      g.qtd += 1;
      g.total += v;
      if (l.status_pagamento === "PAGO") {
        g.pago += v;
        g.idsPagos.push(l.id);
      } else {
        g.pendente += v;
        g.idsPendentes.push(l.id);
      }
    }

    const tbodyEmp = document.getElementById("tbody-acumulado-empresa");
    const arrEmp = Array.from(mapEmp.values()).sort((a, b) => b.total - a.total);
    tbodyEmp.innerHTML = arrEmp.length === 0
      ? `<tr><td colspan="6" style="text-align:center; padding:18px; color:#64748b;">Sem lançamentos ativos no período selecionado.</td></tr>`
      : arrEmp.map(e => `
        <tr>
          <td data-label="Empresa"><strong>${e.nome}</strong></td>
          <td data-label="Qtd. Serviços">${e.qtd}</td>
          <td data-label="Pendente" style="color:#b45309; font-weight:700;">${formatMoeda(e.pendente)}</td>
          <td data-label="Pago" style="color:#15803d; font-weight:700;">${formatMoeda(e.pago)}</td>
          <td data-label="Total Empresa"><strong>${formatMoeda(e.total)}</strong></td>
          <td data-label="Ações">
            <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
              ${e.idsPendentes.length > 0 ? `
                <button type="button" class="btn btn-sm btn-success" data-fech-emp-pagar="${e.id}">
                  Quitar Empresa (${e.idsPendentes.length})
                </button>
              ` : ""}
              ${e.idsPagos.length > 0 ? `
                <button type="button" class="btn btn-sm btn-outline" data-fech-emp-pendente="${e.id}">
                  Voltar Pendente
                </button>
              ` : ""}
            </div>
          </td>
        </tr>
      `).join("");

    tbodyCol.onclick = async (ev) => {
      const btnPagar = ev.target.closest("[data-fech-colab-pagar]");
      const btnPend = ev.target.closest("[data-fech-colab-pendente]");
      const sessao = window.DB.getSessao("ADM");
      const ref = document.getElementById("fech-referencia").value || "Fechamento";
      if (btnPagar) {
        const g = mapColab.get(btnPagar.dataset.fechColabPagar);
        if (g) {
          await window.DB.alterarStatusPagamento(g.idsPendentes, "PAGO", ref, sessao);
          carregarTudoAdm();
        }
      } else if (btnPend) {
        const g = mapColab.get(btnPend.dataset.fechColabPendente);
        if (g) {
          await window.DB.alterarStatusPagamento(g.idsPagos, "PENDENTE", ref, sessao);
          carregarTudoAdm();
        }
      }
    };

    tbodyEmp.onclick = async (ev) => {
      const btnPagar = ev.target.closest("[data-fech-emp-pagar]");
      const btnPend = ev.target.closest("[data-fech-emp-pendente]");
      const sessao = window.DB.getSessao("ADM");
      const ref = document.getElementById("fech-referencia").value || "Fechamento";
      if (btnPagar) {
        const g = mapEmp.get(btnPagar.dataset.fechEmpPagar);
        if (g) {
          await window.DB.alterarStatusPagamento(g.idsPendentes, "PAGO", ref, sessao);
          carregarTudoAdm();
        }
      } else if (btnPend) {
        const g = mapEmp.get(btnPend.dataset.fechEmpPendente);
        if (g) {
          await window.DB.alterarStatusPagamento(g.idsPagos, "PENDENTE", ref, sessao);
          carregarTudoAdm();
        }
      }
    };
  }

  // ==========================================================================
  // ABA 3: RECIBOS INDIVIDUAIS POR COLABORADOR E POR EMPRESA
  // ==========================================================================
  ["rec-data-ini", "rec-data-fim", "rec-colaborador", "rec-empresa", "rec-status-pag"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderAbaRecibos);
  });

  function renderAbaRecibos() {
    const store = window.DB.loadLocalStore();
    const dtIni = document.getElementById("rec-data-ini").value;
    const dtFim = document.getElementById("rec-data-fim").value;
    const colId = document.getElementById("rec-colaborador").value;
    const empId = document.getElementById("rec-empresa").value;
    const stPag = document.getElementById("rec-status-pag").value;

    const filtrados = store.lancamentos.filter(l => {
      if (l.status_lancamento !== "ATIVO") return false;
      if (dtIni && l.data_trabalho < dtIni) return false;
      if (dtFim && l.data_trabalho > dtFim) return false;
      if (colId && l.colaborador_id !== colId) return false;
      if (empId && l.empresa_id !== empId) return false;
      if (stPag !== "TODOS" && l.status_pagamento !== stPag) return false;
      return true;
    }).sort((a, b) => (a.data_trabalho || "").localeCompare(b.data_trabalho || ""));

    const gruposRecibo = new Map();
    for (const l of filtrados) {
      const chave = `${l.colaborador_id}___${l.empresa_id}`;
      if (!gruposRecibo.has(chave)) {
        gruposRecibo.set(chave, {
          chave,
          colaborador_id: l.colaborador_id,
          colaborador_nome: l.colaborador_nome,
          documento: obterDocumentoColaborador(l.colaborador_id),
          cargo_nome: l.cargo_nome,
          empresa_nome: l.empresa_nome,
          itens: [],
          total: 0
        });
      }
      const g = gruposRecibo.get(chave);
      g.itens.push(l);
      g.total += Number(l.valor || 0);
    }

    const container = document.getElementById("container-recibos");
    const listaRecibos = Array.from(gruposRecibo.values());

    if (listaRecibos.length === 0) {
      container.innerHTML = `<div class="panel-card" style="text-align:center; color:#64748b;">Nenhum serviço ativo encontrado para gerar recibos com os filtros atuais.</div>`;
      return;
    }

    const dataEmissao = formatDataBR(new Date().toISOString().slice(0, 10));

    container.innerHTML = listaRecibos.map((rec, idx) => `
      <article class="recibo-sheet" id="recibo-box-${idx}">
        <div class="recibo-controls no-print" style="display:flex; justify-content:flex-end; margin-bottom:12px;">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.imprimirReciboUnico('recibo-box-${idx}')">
            Imprimir / Salvar PDF deste Recibo
          </button>
        </div>

        <div class="recibo-top">
          <div>
            <h2>RECIBO DE PAGAMENTO DE SERVIÇOS EXTRAS</h2>
            <div style="font-size:0.88rem; color:#334155; margin-top:4px;">
              <strong>Empresa:</strong> ${rec.empresa_nome}
            </div>
          </div>
          <div class="recibo-valor-box">
            Total: ${formatMoeda(rec.total)}
          </div>
        </div>

        <div class="recibo-meta">
          <div><strong>Colaborador:</strong> ${rec.colaborador_nome}</div>
          <div><strong>Documento (CPF/RG):</strong> ${rec.documento}</div>
          <div><strong>Cargo / Função:</strong> ${rec.cargo_nome || "-"}</div>
          <div><strong>Empresa Tomadora:</strong> ${rec.empresa_nome}</div>
        </div>

        <div class="table-responsive">
          <table class="data-table" style="border:1px solid #cbd5e1; margin-bottom:16px;">
            <thead>
              <tr>
                <th>Data do Serviço</th>
                <th>Turno</th>
                <th>Motivo da Solicitação</th>
                <th>Solicitado por</th>
                <th style="text-align:right;">Valor Individual</th>
              </tr>
            </thead>
            <tbody>
              ${rec.itens.map(item => `
                <tr>
                  <td>${formatDataBR(item.data_trabalho)}</td>
                  <td>${item.turno}</td>
                  <td>${item.motivo}</td>
                  <td>${item.lancado_por_nome || item.solicitante_nome}</td>
                  <td style="text-align:right; font-weight:700;">${formatMoeda(item.valor)}</td>
                </tr>
              `).join("")}
              <tr style="background:#f1f5f9; font-weight:800;">
                <td colspan="4" style="text-align:right;">TOTAL A RECEBER:</td>
                <td style="text-align:right; font-size:1.05rem;">${formatMoeda(rec.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style="font-size:0.9rem; line-height:1.6; margin-top:10px;">
          Recebi de <strong>${rec.empresa_nome}</strong> a importância total de <strong>${formatMoeda(rec.total)}</strong>,
          referente aos serviços extras discriminados acima, dando plena e geral quitação.
        </p>

        <div class="recibo-assinatura">
          <div style="font-size:0.88rem; margin-bottom:8px;">Data de emissão: ${dataEmissao}</div>
          <div class="linha">${rec.colaborador_nome} — Doc: ${rec.documento}<br/><span style="font-weight:400; font-size:0.8rem;">Assinatura do Colaborador (${rec.cargo_nome})</span></div>
        </div>
      </article>
    `).join("");
  }

  window.imprimirReciboUnico = function (elementId) {
    const todos = document.querySelectorAll(".recibo-sheet");
    todos.forEach(el => {
      if (el.id !== elementId) el.classList.add("no-print");
    });
    window.print();
    todos.forEach(el => el.classList.remove("no-print"));
  };

  document.getElementById("btn-imprimir-todos-recibos").addEventListener("click", () => {
    window.print();
  });

  // ==========================================================================
  // ABA 4: RELATÓRIOS COMPLETOS (PDF FORMATO PAISAGEM + EXCEL .XLSX)
  // ==========================================================================
  ["rel-data-ini", "rel-data-fim", "rel-empresa", "rel-colaborador", "rel-pagamento", "rel-tipo-visao"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", renderAbaRelatorios);
  });

  function obterLancamentosBaseRelatorio() {
    const store = window.DB.loadLocalStore();
    const dtIni = document.getElementById("rel-data-ini").value;
    const dtFim = document.getElementById("rel-data-fim").value;
    const empId = document.getElementById("rel-empresa").value;
    const colId = document.getElementById("rel-colaborador").value;
    const stPag = document.getElementById("rel-pagamento").value;

    return store.lancamentos
      .filter(l => {
        if (l.status_lancamento !== "ATIVO") return false;
        if (dtIni && l.data_trabalho < dtIni) return false;
        if (dtFim && l.data_trabalho > dtFim) return false;
        if (empId && l.empresa_id !== empId) return false;
        if (colId && l.colaborador_id !== colId) return false;
        if (stPag !== "TODOS" && l.status_pagamento !== stPag) return false;
        return true;
      })
      .sort((a, b) => (a.data_trabalho || "").localeCompare(b.data_trabalho || ""));
  }

  function obterDadosRelatorios() {
    const ativos = obterLancamentosBaseRelatorio();

    const mapCol = new Map();
    for (const l of ativos) {
      if (!mapCol.has(l.colaborador_id)) {
        mapCol.set(l.colaborador_id, {
          Colaborador: l.colaborador_nome,
          Documento: obterDocumentoColaborador(l.colaborador_id),
          Cargo: l.cargo_nome,
          "Qtd Serviços": 0,
          "Total Pendente (R$)": 0,
          "Total Pago (R$)": 0,
          "Total Geral (R$)": 0
        });
      }
      const r = mapCol.get(l.colaborador_id);
      const v = Number(l.valor || 0);
      r["Qtd Serviços"] += 1;
      r["Total Geral (R$)"] += v;
      if (l.status_pagamento === "PAGO") r["Total Pago (R$)"] += v;
      else r["Total Pendente (R$)"] += v;
    }

    const mapEmp = new Map();
    for (const l of ativos) {
      if (!mapEmp.has(l.empresa_id)) {
        mapEmp.set(l.empresa_id, {
          Empresa: l.empresa_nome,
          "Qtd Serviços": 0,
          "Total Pendente (R$)": 0,
          "Total Pago (R$)": 0,
          "Total Geral (R$)": 0
        });
      }
      const r = mapEmp.get(l.empresa_id);
      const v = Number(l.valor || 0);
      r["Qtd Serviços"] += 1;
      r["Total Geral (R$)"] += v;
      if (l.status_pagamento === "PAGO") r["Total Pago (R$)"] += v;
      else r["Total Pendente (R$)"] += v;
    }

    const formatarLinhaDetalhe = (l) => ({
      "Data do Serviço": formatDataBR(l.data_trabalho),
      "Quem Realizou (Colaborador)": l.colaborador_nome,
      Documento: obterDocumentoColaborador(l.colaborador_id),
      Cargo: l.cargo_nome,
      Empresa: l.empresa_nome,
      "Turno Realizado": l.turno,
      Motivo: l.motivo,
      Solicitante: l.lancado_por_nome || l.solicitante_nome,
      Pagamento: l.status_pagamento,
      "Valor (R$)": Number(l.valor || 0)
    });

    const totalGeral = ativos.reduce((acc, l) => acc + Number(l.valor || 0), 0);
    const totalPago = ativos.filter(l => l.status_pagamento === "PAGO").reduce((acc, l) => acc + Number(l.valor || 0), 0);
    const totalPendente = ativos.filter(l => l.status_pagamento === "PENDENTE").reduce((acc, l) => acc + Number(l.valor || 0), 0);

    return {
      rawAtivos: ativos,
      resumo: {
        qtd: ativos.length,
        totalGeral,
        totalPago,
        totalPendente
      },
      COLABORADOR: Array.from(mapCol.values()),
      EMPRESA: Array.from(mapEmp.values()),
      PERIODO: ativos.map(formatarLinhaDetalhe),
      PENDENTES: ativos.filter(l => l.status_pagamento === "PENDENTE").map(formatarLinhaDetalhe),
      PAGOS: ativos.filter(l => l.status_pagamento === "PAGO").map(formatarLinhaDetalhe)
    };
  }

  function renderAbaRelatorios() {
    const tipo = document.getElementById("rel-tipo-visao").value;
    const pacotes = obterDadosRelatorios();
    const linhas = pacotes[tipo] || [];
    const thead = document.getElementById("thead-relatorio");
    const tbody = document.getElementById("tbody-relatorio");

    // Atualiza o quadro resumo inferior com o valor total dos serviços no período solicitado
    document.getElementById("rel-valor-total-periodo").textContent = formatMoeda(pacotes.resumo.totalGeral);
    document.getElementById("rel-resumo-detalhe").innerHTML =
      `<strong>${pacotes.resumo.qtd}</strong> serviços no período | ` +
      `Pago: <strong style="color:#15803d;">${formatMoeda(pacotes.resumo.totalPago)}</strong> | ` +
      `Pendente: <strong style="color:#b45309;">${formatMoeda(pacotes.resumo.totalPendente)}</strong>`;

    if (linhas.length === 0) {
      thead.innerHTML = "";
      tbody.innerHTML = `<tr><td style="text-align:center; padding:24px; color:#64748b;">Sem registros para este relatório no período selecionado.</td></tr>`;
      return;
    }

    const colunas = Object.keys(linhas[0]);
    thead.innerHTML = `<tr>${colunas.map(c => `<th>${c}</th>`).join("")}</tr>`;
    tbody.innerHTML = linhas.map(row => `
      <tr>
        ${colunas.map(col => {
          const val = row[col];
          if (typeof val === "number" && col.includes("(R$)")) {
            return `<td data-label="${col}"><strong>${formatMoeda(val)}</strong></td>`;
          }
          return `<td data-label="${col}">${val ?? "-"}</td>`;
        }).join("")}
      </tr>
    `).join("");
  }

  // Geração do Relatório Analítico Completo em PDF e Formato Paisagem
  document.getElementById("btn-export-relatorio-pdf-paisagem").addEventListener("click", () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("A biblioteca PDF ainda está carregando. Tente novamente em instantes.");
      return;
    }

    const pacotes = obterDadosRelatorios();
    const ativos = pacotes.rawAtivos;
    if (ativos.length === 0) {
      alert("Não há serviços registrados no período/filtro selecionado para gerar o PDF.");
      return;
    }

    const dtIni = document.getElementById("rel-data-ini").value;
    const dtFim = document.getElementById("rel-data-fim").value;
    const selEmp = document.getElementById("rel-empresa");
    const selCol = document.getElementById("rel-colaborador");

    const periodoTexto = (dtIni || dtFim)
      ? `${dtIni ? formatDataBR(dtIni) : "Início"} até ${dtFim ? formatDataBR(dtFim) : "Hoje"}`
      : "Todo o Período Registrado";
    const empresaTexto = selEmp.value ? selEmp.options[selEmp.selectedIndex].text : "Todas as Empresas";
    const colabTexto = selCol.value ? selCol.options[selCol.selectedIndex].text : "Todos os Colaboradores";

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Cabeçalho do Relatório Paisagem
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("RELATÓRIO COMPLETO DE SERVIÇOS EXTRAS REALIZADOS", 14, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Período Solicitado: ${periodoTexto}   |   Empresa: ${empresaTexto}   |   Colaborador: ${colabTexto}`, 14, 21);
    doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}   |   Quantidade de Serviços: ${pacotes.resumo.qtd}`, 14, 26);

    // Linhas detalhadas conforme solicitado:
    // Data do serviço, Nome de quem realizou (+ Documento e Cargo), Empresa, Motivo, Turno realizado, Valor e Total ao final
    const bodyRows = ativos.map(l => [
      formatDataBR(l.data_trabalho),
      l.colaborador_nome,
      obterDocumentoColaborador(l.colaborador_id),
      l.cargo_nome || "-",
      l.empresa_nome,
      l.turno,
      l.motivo,
      l.lancado_por_nome || l.solicitante_nome || "-",
      l.status_pagamento,
      formatMoeda(l.valor)
    ]);

    doc.autoTable({
      startY: 31,
      head: [[
        "Data Serviço",
        "Quem Realizou (Colaborador)",
        "Documento",
        "Cargo",
        "Empresa",
        "Turno",
        "Motivo da Solicitação",
        "Solicitante",
        "Situação",
        "Valor (R$)"
      ]],
      body: bodyRows,
      foot: [[
        { content: `VALOR TOTAL DOS SERVIÇOS NO PERÍODO SOLICITADO (${pacotes.resumo.qtd} serviços):`, colSpan: 9, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatMoeda(pacotes.resumo.totalGeral), styles: { halign: "right", fontStyle: "bold" } }
      ]],
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 2.5,
        textColor: [15, 23, 42]
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold"
      },
      footStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 9.5,
        fontStyle: "bold"
      },
      columnStyles: {
        0: { cellWidth: 22 },
        5: { cellWidth: 18 },
        8: { cellWidth: 21 },
        9: { halign: "right", cellWidth: 26, fontStyle: "bold" }
      }
    });

    // Quadros Resumo no final do PDF Paisagem (Por Empresa e Situação Financeira)
    let finalY = doc.lastAutoTable.finalY + 8;
    if (finalY > 170) {
      doc.addPage("a4", "landscape");
      finalY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text("RESUMO FINANCEIRO DO PERÍODO SOLICITADO (POR EMPRESA E SITUAÇÃO)", 14, finalY);

    const rowsEmpresas = pacotes.EMPRESA.map(e => [
      e.Empresa,
      String(e["Qtd Serviços"]),
      formatMoeda(e["Total Pendente (R$)"]),
      formatMoeda(e["Total Pago (R$)"]),
      formatMoeda(e["Total Geral (R$)"])
    ]);

    doc.autoTable({
      startY: finalY + 3,
      head: [["Empresa", "Qtd. Serviços", "Total Pendente", "Total Pago", "Valor Total no Período"]],
      body: rowsEmpresas,
      foot: [[
        "TOTAL GERAL DO PERÍODO",
        String(pacotes.resumo.qtd),
        formatMoeda(pacotes.resumo.totalPendente),
        formatMoeda(pacotes.resumo.totalPago),
        formatMoeda(pacotes.resumo.totalGeral)
      ]],
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
      footStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: "bold" }
    });

    const nomeArq = `relatorio_paisagem_servicos_extras_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(nomeArq);
  });

  function exportarParaExcel(dadosJson, nomeAba, nomeArquivo) {
    if (!window.XLSX) {
      alert("Biblioteca Excel não carregada. Verifique sua conexão.");
      return;
    }
    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.json_to_sheet(dadosJson.length > 0 ? dadosJson : [{ Aviso: "Sem dados" }]);
    window.XLSX.utils.book_append_sheet(wb, ws, nomeAba.slice(0, 31));
    window.XLSX.writeFile(wb, nomeArquivo);
  }

  document.getElementById("btn-export-relatorio-atual").addEventListener("click", () => {
    const tipo = document.getElementById("rel-tipo-visao").value;
    const pacotes = obterDadosRelatorios();
    exportarParaExcel(pacotes[tipo] || [], `Rel_${tipo}`, `relatorio_${tipo.toLowerCase()}.xlsx`);
  });

  document.getElementById("btn-export-pacote-completo").addEventListener("click", () => {
    if (!window.XLSX) return;
    const pacotes = obterDadosRelatorios();
    const wb = window.XLSX.utils.book_new();

    const abas = [
      { key: "PERIODO", title: "Servicos por Periodo" },
      { key: "COLABORADOR", title: "Total por Colaborador" },
      { key: "EMPRESA", title: "Total por Empresa" },
      { key: "PENDENTES", title: "Valores Pendentes" },
      { key: "PAGOS", title: "Valores Pagos" }
    ];

    for (const aba of abas) {
      const rows = pacotes[aba.key];
      const ws = window.XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Info: "Sem registros no período" }]);
      window.XLSX.utils.book_append_sheet(wb, ws, aba.title);
    }

    window.XLSX.writeFile(wb, `relatorios_servicos_extras_${new Date().toISOString().slice(0, 10)}.xlsx`);
  });

  // ==========================================================================
  // ABA 5: CADASTROS E TABELA DE VALORES (EMPRESA + CARGO + VALOR)
  // ==========================================================================
  function renderAbaCadastros() {
    const store = window.DB.loadLocalStore();

    document.getElementById("tbody-valores").innerHTML = store.tabela_valores.map(v => `
      <tr>
        <td data-label="Empresa"><strong>${v.empresa_nome}</strong></td>
        <td data-label="Cargo">${v.cargo_nome}</td>
        <td data-label="Valor Automático"><strong style="color:#15803d;">${formatMoeda(v.valor)}</strong></td>
        <td data-label="Ações">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-outline" data-edit-val="${v.id}">Editar Valor</button>
            <button type="button" class="btn btn-sm btn-danger" data-del-val="${v.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `).join("");

    document.getElementById("tbody-colaboradores").innerHTML = store.colaboradores.map(c => `
      <tr>
        <td data-label="Nome"><strong>${c.nome}</strong></td>
        <td data-label="Cargo">${c.cargo_nome}</td>
        <td data-label="Documento">${c.documento || "-"}</td>
        <td data-label="Status"><span class="status-pill ${c.ativo !== false ? "ativo" : "inativo"}">${c.ativo !== false ? "Ativo" : "Inativo"}</span></td>
        <td data-label="Ações">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-outline" data-edit-col="${c.id}">Editar</button>
            <button type="button" class="btn btn-sm btn-outline" data-toggle-col="${c.id}">${c.ativo !== false ? "Inativar" : "Ativar"}</button>
          </div>
        </td>
      </tr>
    `).join("");

    document.getElementById("tbody-empresas").innerHTML = store.empresas.map(e => `
      <tr>
        <td data-label="Empresa"><strong>${e.nome}</strong></td>
        <td data-label="CNPJ">${e.cnpj || "-"}</td>
        <td data-label="Status"><span class="status-pill ${e.ativo !== false ? "ativo" : "inativo"}">${e.ativo !== false ? "Ativa" : "Inativa"}</span></td>
        <td data-label="Ações">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-outline" data-edit-emp="${e.id}">Editar</button>
            <button type="button" class="btn btn-sm btn-outline" data-toggle-emp="${e.id}">${e.ativo !== false ? "Inativar" : "Ativar"}</button>
          </div>
        </td>
      </tr>
    `).join("");

    document.getElementById("tbody-cargos").innerHTML = store.cargos.map(c => `
      <tr>
        <td data-label="Cargo"><strong>${c.nome}</strong></td>
        <td data-label="Status"><span class="status-pill ${c.ativo !== false ? "ativo" : "inativo"}">${c.ativo !== false ? "Ativo" : "Inativo"}</span></td>
        <td data-label="Ações">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-outline" data-edit-crg="${c.id}">Editar</button>
            <button type="button" class="btn btn-sm btn-outline" data-toggle-crg="${c.id}">${c.ativo !== false ? "Inativar" : "Ativar"}</button>
          </div>
        </td>
      </tr>
    `).join("");

    document.getElementById("tbody-usuarios").innerHTML = store.usuarios.map(u => `
      <tr>
        <td data-label="Nome"><strong>${u.nome}</strong></td>
        <td data-label="Login"><code>${u.login}</code></td>
        <td data-label="Senha"><code>${u.senha}</code></td>
        <td data-label="Módulo">${u.perfil === "ADM" ? "Administrador (ADM + Celular)" : "Solicitante Autorizado (Celular)"}</td>
        <td data-label="Status"><span class="status-pill ${u.ativo !== false ? "ativo" : "inativo"}">${u.ativo !== false ? "Ativo" : "Bloqueado"}</span></td>
        <td data-label="Ações">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button type="button" class="btn btn-sm btn-outline" data-edit-usr="${u.id}">Editar</button>
            <button type="button" class="btn btn-sm btn-outline" data-toggle-usr="${u.id}">${u.ativo !== false ? "Bloquear" : "Ativar"}</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  document.getElementById("form-cad-valor").addEventListener("submit", async (e) => {
    e.preventDefault();
    const store = window.DB.loadLocalStore();
    const empId = document.getElementById("val-empresa").value;
    const crgId = document.getElementById("val-cargo").value;
    const valor = parseFloat(document.getElementById("val-valor").value);
    const idExistente = document.getElementById("val-id").value;

    const emp = store.empresas.find(x => x.id === empId);
    const crg = store.cargos.find(x => x.id === crgId);
    if (!emp || !crg) return;

    const duplicado = store.tabela_valores.find(v => v.empresa_id === empId && v.cargo_id === crgId);
    const idFinal = idExistente || (duplicado ? duplicado.id : window.DB.generateId("val"));

    await window.DB.upsertItem("tabela_valores", {
      id: idFinal,
      empresa_id: emp.id,
      empresa_nome: emp.nome,
      cargo_id: crg.id,
      cargo_nome: crg.nome,
      valor: valor,
      atualizado_em: new Date().toISOString()
    });

    e.target.reset();
    document.getElementById("val-id").value = "";
    carregarTudoAdm();
  });

  document.getElementById("tbody-valores").addEventListener("click", async (e) => {
    const btnEdit = e.target.closest("[data-edit-val]");
    const btnDel = e.target.closest("[data-del-val]");
    const store = window.DB.loadLocalStore();
    if (btnEdit) {
      const item = store.tabela_valores.find(v => v.id === btnEdit.dataset.editVal);
      if (!item) return;
      document.getElementById("val-id").value = item.id;
      document.getElementById("val-empresa").value = item.empresa_id;
      document.getElementById("val-cargo").value = item.cargo_id;
      document.getElementById("val-valor").value = Number(item.valor).toFixed(2);
    } else if (btnDel) {
      await window.DB.deleteItem("tabela_valores", btnDel.dataset.delVal);
      carregarTudoAdm();
    }
  });

  document.getElementById("form-cad-colaborador").addEventListener("submit", async (e) => {
    e.preventDefault();
    const store = window.DB.loadLocalStore();
    const id = document.getElementById("col-id").value || window.DB.generateId("col");
    const nome = document.getElementById("col-nome").value.trim();
    const cargoId = document.getElementById("col-cargo").value;
    const doc = document.getElementById("col-doc").value.trim();
    const crg = store.cargos.find(c => c.id === cargoId);

    await window.DB.upsertItem("colaboradores", {
      id,
      nome,
      cargo_id: cargoId,
      cargo_nome: crg ? crg.nome : "",
      documento: doc,
      ativo: true,
      criado_em: new Date().toISOString()
    });
    e.target.reset();
    document.getElementById("col-id").value = "";
    carregarTudoAdm();
  });

  document.getElementById("tbody-colaboradores").addEventListener("click", async (e) => {
    const btnEdit = e.target.closest("[data-edit-col]");
    const btnToggle = e.target.closest("[data-toggle-col]");
    const store = window.DB.loadLocalStore();
    if (btnEdit) {
      const c = store.colaboradores.find(x => x.id === btnEdit.dataset.editCol);
      if (!c) return;
      document.getElementById("col-id").value = c.id;
      document.getElementById("col-nome").value = c.nome;
      document.getElementById("col-cargo").value = c.cargo_id;
      document.getElementById("col-doc").value = c.documento || "";
    } else if (btnToggle) {
      const c = store.colaboradores.find(x => x.id === btnToggle.dataset.toggleCol);
      if (!c) return;
      await window.DB.upsertItem("colaboradores", { ...c, ativo: c.ativo === false });
      carregarTudoAdm();
    }
  });

  document.getElementById("form-cad-empresa").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("emp-id").value || window.DB.generateId("emp");
    await window.DB.upsertItem("empresas", {
      id,
      nome: document.getElementById("emp-nome").value.trim(),
      cnpj: document.getElementById("emp-cnpj").value.trim(),
      ativo: true,
      criado_em: new Date().toISOString()
    });
    e.target.reset();
    document.getElementById("emp-id").value = "";
    carregarTudoAdm();
  });

  document.getElementById("tbody-empresas").addEventListener("click", async (e) => {
    const btnEdit = e.target.closest("[data-edit-emp]");
    const btnToggle = e.target.closest("[data-toggle-emp]");
    const store = window.DB.loadLocalStore();
    if (btnEdit) {
      const emp = store.empresas.find(x => x.id === btnEdit.dataset.editEmp);
      if (!emp) return;
      document.getElementById("emp-id").value = emp.id;
      document.getElementById("emp-nome").value = emp.nome;
      document.getElementById("emp-cnpj").value = emp.cnpj || "";
    } else if (btnToggle) {
      const emp = store.empresas.find(x => x.id === btnToggle.dataset.toggleEmp);
      if (!emp) return;
      await window.DB.upsertItem("empresas", { ...emp, ativo: emp.ativo === false });
      carregarTudoAdm();
    }
  });

  document.getElementById("form-cad-cargo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("crg-id").value || window.DB.generateId("crg");
    await window.DB.upsertItem("cargos", {
      id,
      nome: document.getElementById("crg-nome").value.trim(),
      ativo: true,
      criado_em: new Date().toISOString()
    });
    e.target.reset();
    document.getElementById("crg-id").value = "";
    carregarTudoAdm();
  });

  document.getElementById("tbody-cargos").addEventListener("click", async (e) => {
    const btnEdit = e.target.closest("[data-edit-crg]");
    const btnToggle = e.target.closest("[data-toggle-crg]");
    const store = window.DB.loadLocalStore();
    if (btnEdit) {
      const crg = store.cargos.find(x => x.id === btnEdit.dataset.editCrg);
      if (!crg) return;
      document.getElementById("crg-id").value = crg.id;
      document.getElementById("crg-nome").value = crg.nome;
    } else if (btnToggle) {
      const crg = store.cargos.find(x => x.id === btnToggle.dataset.toggleCrg);
      if (!crg) return;
      await window.DB.upsertItem("cargos", { ...crg, ativo: crg.ativo === false });
      carregarTudoAdm();
    }
  });

  document.getElementById("form-cad-usuario").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("usr-id").value || window.DB.generateId("usr");
    await window.DB.upsertItem("usuarios", {
      id,
      nome: document.getElementById("usr-nome").value.trim(),
      login: document.getElementById("usr-login").value.trim().toLowerCase(),
      senha: document.getElementById("usr-senha").value.trim(),
      perfil: document.getElementById("usr-perfil").value,
      ativo: true,
      criado_em: new Date().toISOString()
    });
    e.target.reset();
    document.getElementById("usr-id").value = "";
    carregarTudoAdm();
  });

  document.getElementById("tbody-usuarios").addEventListener("click", async (e) => {
    const btnEdit = e.target.closest("[data-edit-usr]");
    const btnToggle = e.target.closest("[data-toggle-usr]");
    const store = window.DB.loadLocalStore();
    if (btnEdit) {
      const u = store.usuarios.find(x => x.id === btnEdit.dataset.editUsr);
      if (!u) return;
      document.getElementById("usr-id").value = u.id;
      document.getElementById("usr-nome").value = u.nome;
      document.getElementById("usr-login").value = u.login;
      document.getElementById("usr-senha").value = u.senha;
      document.getElementById("usr-perfil").value = u.perfil;
    } else if (btnToggle) {
      const u = store.usuarios.find(x => x.id === btnToggle.dataset.toggleUsr);
      if (!u) return;
      await window.DB.upsertItem("usuarios", { ...u, ativo: u.ativo === false });
      carregarTudoAdm();
    }
  });

  // ==========================================================================
  // ABA 6: RETENÇÃO DE 30 DIAS E CONEXÃO SUPABASE
  // ==========================================================================
  function renderAbaArmazenamento() {
    const analise = window.DB.analisarRetencao30Dias();
    document.getElementById("ret-qtd-expurgaveis").textContent = analise.expurgaveis.length;
    document.getElementById("ret-qtd-protegidos").textContent = analise.protegidos.length;

    const btnLimpar = document.getElementById("btn-limpar-30d");
    btnLimpar.disabled = !(backup30dRealizado && analise.expurgaveis.length > 0);

    const creds = window.DB.getSupabaseCredentials();
    document.getElementById("supa-url").value = creds.url || "";
    document.getElementById("supa-key").value = creds.key || "";
  }

  document.getElementById("btn-arquivar-30d-xlsx").addEventListener("click", () => {
    const analise = window.DB.analisarRetencao30Dias();
    const dadosExport = analise.expurgaveis.map(l => ({
      ID: l.id,
      "Data Trabalho": formatDataBR(l.data_trabalho),
      "Data Inclusão": formatDataHoraBR(l.criado_em),
      Colaborador: l.colaborador_nome,
      Documento: obterDocumentoColaborador(l.colaborador_id),
      Cargo: l.cargo_nome,
      Empresa: l.empresa_nome,
      Turno: l.turno,
      Motivo: l.motivo,
      "Solicitante / Lançado Por": l.lancado_por_nome || l.solicitante_nome,
      "Valor (R$)": Number(l.valor),
      "Status Pagamento": l.status_pagamento,
      "Situação": l.status_lancamento
    }));

    exportarParaExcel(dadosExport, "Arquivo_30_Dias", `arquivo_morto_30dias_${new Date().toISOString().slice(0, 10)}.xlsx`);
    backup30dRealizado = true;
    document.getElementById("ret-msg-status").textContent = "Backup em Excel gerado! Agora você pode remover os registros operacionais antigos já quitados.";
    renderAbaArmazenamento();
  });

  document.getElementById("btn-limpar-30d").addEventListener("click", async () => {
    const analise = window.DB.analisarRetencao30Dias();
    if (analise.expurgaveis.length === 0) return;
    if (!confirm(`Confirmar limpeza de ${analise.expurgaveis.length} registros pagos/cancelados com mais de 30 dias? (Pagamentos pendentes e retenções legais continuarão preservados).`)) return;
    await window.DB.executarExpurgoSeguro(analise.expurgaveis.map(x => x.id));
    backup30dRealizado = false;
    carregarTudoAdm();
  });

  document.getElementById("form-supabase-config").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("supa-url").value.trim();
    const key = document.getElementById("supa-key").value.trim();
    const fb = document.getElementById("supa-feedback");

    window.DB.setSupabaseCredentials(url, key);
    const status = await window.DB.initDatabase();
    atualizarStatusNuvem(status.connected);

    fb.classList.remove("hidden");
    if (status.connected) {
      fb.className = "toast-feedback success";
      fb.textContent = "Conectado ao Supabase com sucesso! Os dados estão sincronizados na nuvem.";
      carregarTudoAdm();
    } else {
      fb.className = "toast-feedback error";
      fb.textContent = `Não foi possível conectar ao Supabase (${status.error || "verifique se executou o script supabase_schema.sql"}).`;
    }
  });

  document.getElementById("btn-push-cloud").addEventListener("click", async () => {
    const fb = document.getElementById("supa-feedback");
    try {
      await window.DB.pushLocalStoreToCloud();
      atualizarStatusNuvem(true);
      fb.className = "toast-feedback success";
      fb.textContent = "Todos os cadastros e lançamentos foram enviados para o Supabase com sucesso!";
      fb.classList.remove("hidden");
    } catch (err) {
      fb.className = "toast-feedback error";
      fb.textContent = err.message;
      fb.classList.remove("hidden");
    }
  });

  verificarSessaoAdm();
});
