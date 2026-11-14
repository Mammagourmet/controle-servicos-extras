// ============================================================================
// CAMADA DE DADOS E AUTENTICAÇÃO (SUPABASE + CACHE LOCAL SINCRONIZADO)
// Compartilhada entre o Módulo de Lançamentos (/lancamentos) e o ADM (/adm)
// ============================================================================

(function () {
  const STORAGE_KEYS = {
    SUPABASE_CREDS: "cse_supabase_creds_v1",
    DATA_STORE: "cse_datastore_v1",
    SESSION_LANCADOR: "cse_session_lancador_v1",
    SESSION_ADM: "cse_session_adm_v1"
  };

  let supabaseClient = null;
  let isCloudConnected = false;

  function getInitialStore() {
    const now = new Date().toISOString();
    return {
      empresas: [
        { id: "emp_1", nome: "Matriz - Unidade Central", cnpj: "12.345.678/0001-90", ativo: true, criado_em: now },
        { id: "emp_2", nome: "Filial Sul - Eventos & Serviços", cnpj: "12.345.678/0002-71", ativo: true, criado_em: now }
      ],
      cargos: [
        { id: "crg_1", nome: "Auxiliar Operacional", ativo: true, criado_em: now },
        { id: "crg_2", nome: "Atendente / Garçom", ativo: true, criado_em: now },
        { id: "crg_3", nome: "Cozinheiro(a)", ativo: true, criado_em: now },
        { id: "crg_4", nome: "Segurança / Portaria", ativo: true, criado_em: now }
      ],
      colaboradores: [
        { id: "col_1", nome: "Carlos Eduardo Silva", cargo_id: "crg_2", cargo_nome: "Atendente / Garçom", documento: "123.456.789-00", telefone: "(11) 99999-1111", ativo: true, criado_em: now },
        { id: "col_2", nome: "Fernanda Oliveira Santos", cargo_id: "crg_3", cargo_nome: "Cozinheiro(a)", documento: "234.567.890-11", telefone: "(11) 99999-2222", ativo: true, criado_em: now },
        { id: "col_3", nome: "Marcos Vinícius Souza", cargo_id: "crg_1", cargo_nome: "Auxiliar Operacional", documento: "345.678.901-22", telefone: "(11) 99999-3333", ativo: true, criado_em: now }
      ],
      tabela_valores: [
        { id: "val_1", empresa_id: "emp_1", empresa_nome: "Matriz - Unidade Central", cargo_id: "crg_1", cargo_nome: "Auxiliar Operacional", valor: 120.00, atualizado_em: now },
        { id: "val_2", empresa_id: "emp_1", empresa_nome: "Matriz - Unidade Central", cargo_id: "crg_2", cargo_nome: "Atendente / Garçom", valor: 150.00, atualizado_em: now },
        { id: "val_3", empresa_id: "emp_1", empresa_nome: "Matriz - Unidade Central", cargo_id: "crg_3", cargo_nome: "Cozinheiro(a)", valor: 180.00, atualizado_em: now },
        { id: "val_4", empresa_id: "emp_1", empresa_nome: "Matriz - Unidade Central", cargo_id: "crg_4", cargo_nome: "Segurança / Portaria", valor: 160.00, atualizado_em: now },
        { id: "val_5", empresa_id: "emp_2", empresa_nome: "Filial Sul - Eventos & Serviços", cargo_id: "crg_1", cargo_nome: "Auxiliar Operacional", valor: 130.00, atualizado_em: now },
        { id: "val_6", empresa_id: "emp_2", empresa_nome: "Filial Sul - Eventos & Serviços", cargo_id: "crg_2", cargo_nome: "Atendente / Garçom", valor: 165.00, atualizado_em: now },
        { id: "val_7", empresa_id: "emp_2", empresa_nome: "Filial Sul - Eventos & Serviços", cargo_id: "crg_3", cargo_nome: "Cozinheiro(a)", valor: 195.00, atualizado_em: now },
        { id: "val_8", empresa_id: "emp_2", empresa_nome: "Filial Sul - Eventos & Serviços", cargo_id: "crg_4", cargo_nome: "Segurança / Portaria", valor: 175.00, atualizado_em: now }
      ],
      usuarios: [
        { id: "usr_admin_1", nome: "Administrador Geral", login: "admin", senha: "123456", perfil: "ADM", ativo: true, criado_em: now },
        { id: "usr_lanc_1", nome: "João Encarregado", login: "joao", senha: "123", perfil: "LANCADOR", ativo: true, criado_em: now },
        { id: "usr_lanc_2", nome: "Maria Supervisora", login: "maria", senha: "123", perfil: "LANCADOR", ativo: true, criado_em: now }
      ],
      lancamentos: []
    };
  }

  function loadLocalStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DATA_STORE);
      if (!raw) {
        const init = getInitialStore();
        localStorage.setItem(STORAGE_KEYS.DATA_STORE, JSON.stringify(init));
        return init;
      }
      const parsed = JSON.parse(raw);
      const init = getInitialStore();
      return {
        empresas: Array.isArray(parsed.empresas) ? parsed.empresas : init.empresas,
        cargos: Array.isArray(parsed.cargos) ? parsed.cargos : init.cargos,
        colaboradores: Array.isArray(parsed.colaboradores) ? parsed.colaboradores : init.colaboradores,
        tabela_valores: Array.isArray(parsed.tabela_valores) ? parsed.tabela_valores : init.tabela_valores,
        usuarios: Array.isArray(parsed.usuarios) && parsed.usuarios.length > 0 ? parsed.usuarios : init.usuarios,
        lancamentos: Array.isArray(parsed.lancamentos) ? parsed.lancamentos : init.lancamentos
      };
    } catch (e) {
      console.error("Erro ao carregar store local:", e);
      return getInitialStore();
    }
  }

  function saveLocalStore(store) {
    localStorage.setItem(STORAGE_KEYS.DATA_STORE, JSON.stringify(store));
  }

  function getSupabaseCredentials() {
    const cfgUrl = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL || "").trim();
    const cfgKey = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_ANON_KEY || "").trim();
    if (cfgUrl && cfgKey) {
      return { url: cfgUrl, key: cfgKey, source: "config.js" };
    }
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPABASE_CREDS) || "null");
      if (saved && saved.url && saved.key) {
        return { url: saved.url.trim(), key: saved.key.trim(), source: "painel" };
      }
    } catch (e) {}
    return { url: "", key: "", source: "local" };
  }

  function setSupabaseCredentials(url, key) {
    if (!url || !key) {
      localStorage.removeItem(STORAGE_KEYS.SUPABASE_CREDS);
      supabaseClient = null;
      isCloudConnected = false;
      return;
    }
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CREDS, JSON.stringify({
      url: url.trim(),
      key: key.trim()
    }));
  }

  function mergeListsUnique(localList, cloudList, keyFn) {
    const map = new Map();
    for (const item of (cloudList || [])) {
      if (item) map.set(keyFn(item), item);
    }
    for (const item of (localList || [])) {
      if (item) map.set(keyFn(item), item);
    }
    return Array.from(map.values());
  }

  async function initDatabase() {
    const creds = getSupabaseCredentials();
    if (creds.url && creds.key && window.supabase && typeof window.supabase.createClient === "function") {
      try {
        supabaseClient = window.supabase.createClient(creds.url, creds.key);
        const { data, error } = await supabaseClient.from("usuarios").select("id").limit(1);
        if (!error) {
          isCloudConnected = true;
          await syncBidirecional();
          return { mode: "SUPABASE", connected: true, url: creds.url };
        } else {
          console.warn("Aviso ao conectar Supabase (usando cache local):", error.message);
          isCloudConnected = false;
          return { mode: "LOCAL", connected: false, error: error.message };
        }
      } catch (err) {
        console.warn("Falha ao inicializar cliente Supabase:", err);
        isCloudConnected = false;
        return { mode: "LOCAL", connected: false, error: err.message };
      }
    }
    loadLocalStore();
    return { mode: "LOCAL", connected: false };
  }

  async function syncBidirecional() {
    if (!supabaseClient || !isCloudConnected) return loadLocalStore();
    try {
      const local = loadLocalStore();
      const [
        resEmpresas,
        resCargos,
        resColaboradores,
        resValores,
        resUsuarios,
        resLancamentos
      ] = await Promise.all([
        supabaseClient.from("empresas").select("*"),
        supabaseClient.from("cargos").select("*"),
        supabaseClient.from("colaboradores").select("*"),
        supabaseClient.from("tabela_valores").select("*"),
        supabaseClient.from("usuarios").select("*"),
        supabaseClient.from("lancamentos").select("*")
      ]);

      const merged = {
        empresas: mergeListsUnique(local.empresas, resEmpresas.data || [], x => x.id),
        cargos: mergeListsUnique(local.cargos, resCargos.data || [], x => String(x.nome || "").trim().toLowerCase()),
        colaboradores: mergeListsUnique(local.colaboradores, resColaboradores.data || [], x => x.id),
        tabela_valores: mergeListsUnique(
          local.tabela_valores,
          (resValores.data || []).map(v => ({ ...v, valor: Number(v.valor || 0) })),
          x => `${x.empresa_id}___${x.cargo_id}`
        ),
        usuarios: mergeListsUnique(local.usuarios, resUsuarios.data || [], x => String(x.login || "").trim().toLowerCase()),
        lancamentos: mergeListsUnique(
          local.lancamentos,
          (resLancamentos.data || []).map(l => ({
            ...l,
            valor: Number(l.valor || 0),
            valor_tabela: Number(l.valor_tabela || 0),
            historico: Array.isArray(l.historico) ? l.historico : []
          })),
          x => x.id
        )
      };

      saveLocalStore(merged);
      await enviarLinhasSeguramente(merged);
      return merged;
    } catch (e) {
      console.error("Erro na sincronização bidirecional:", e);
      return loadLocalStore();
    }
  }

  async function enviarLinhasSeguramente(store) {
    if (!supabaseClient) return;

    if (store.empresas && store.empresas.length > 0) {
      await supabaseClient.from("empresas").upsert(store.empresas, { onConflict: "id" });
    }

    const cargosUnicos = mergeListsUnique(store.cargos, [], x => String(x.nome || "").trim().toLowerCase());
    for (const crg of cargosUnicos) {
      const { error } = await supabaseClient.from("cargos").upsert(crg, { onConflict: "id" });
      if (error && error.message.includes("cargos_nome_key")) {
        await supabaseClient.from("cargos").upsert(crg, { onConflict: "nome" });
      }
    }

    if (store.colaboradores && store.colaboradores.length > 0) {
      await supabaseClient.from("colaboradores").upsert(store.colaboradores, { onConflict: "id" });
    }

    const valoresUnicos = mergeListsUnique(store.tabela_valores, [], x => `${x.empresa_id}___${x.cargo_id}`);
    for (const val of valoresUnicos) {
      await supabaseClient
        .from("tabela_valores")
        .delete()
        .eq("empresa_id", val.empresa_id)
        .eq("cargo_id", val.cargo_id)
        .neq("id", val.id);

      const { error } = await supabaseClient
        .from("tabela_valores")
        .upsert(val, { onConflict: "id" });

      if (error) {
        await supabaseClient
          .from("tabela_valores")
          .upsert(val, { onConflict: "empresa_id,cargo_id" });
      }
    }

    const usuariosUnicos = mergeListsUnique(store.usuarios, [], x => String(x.login || "").trim().toLowerCase());
    for (const usr of usuariosUnicos) {
      await supabaseClient
        .from("usuarios")
        .delete()
        .eq("login", usr.login)
        .neq("id", usr.id);
      await supabaseClient.from("usuarios").upsert(usr, { onConflict: "id" });
    }

    if (store.lancamentos && store.lancamentos.length > 0) {
      await supabaseClient.from("lancamentos").upsert(store.lancamentos, { onConflict: "id" });
    }
  }

  async function pullAllFromCloud() {
    if (!supabaseClient || !isCloudConnected) return loadLocalStore();
    try {
      const [
        resEmpresas,
        resCargos,
        resColaboradores,
        resValores,
        resUsuarios,
        resLancamentos
      ] = await Promise.all([
        supabaseClient.from("empresas").select("*").order("nome"),
        supabaseClient.from("cargos").select("*").order("nome"),
        supabaseClient.from("colaboradores").select("*").order("nome"),
        supabaseClient.from("tabela_valores").select("*"),
        supabaseClient.from("usuarios").select("*").order("nome"),
        supabaseClient.from("lancamentos").select("*").order("data_trabalho", { ascending: false })
      ]);

      const local = loadLocalStore();
      const updated = {
        empresas: !resEmpresas.error && resEmpresas.data ? resEmpresas.data : local.empresas,
        cargos: !resCargos.error && resCargos.data ? resCargos.data : local.cargos,
        colaboradores: !resColaboradores.error && resColaboradores.data ? resColaboradores.data : local.colaboradores,
        tabela_valores: !resValores.error && resValores.data ? resValores.data.map(v => ({ ...v, valor: Number(v.valor || 0) })) : local.tabela_valores,
        usuarios: !resUsuarios.error && resUsuarios.data && resUsuarios.data.length > 0 ? resUsuarios.data : local.usuarios,
        lancamentos: !resLancamentos.error && resLancamentos.data ? resLancamentos.data.map(l => ({
          ...l,
          valor: Number(l.valor || 0),
          valor_tabela: Number(l.valor_tabela || 0),
          historico: Array.isArray(l.historico) ? l.historico : []
        })) : local.lancamentos
      };
      saveLocalStore(updated);
      return updated;
    } catch (e) {
      console.error("Erro ao sincronizar do Supabase:", e);
      return loadLocalStore();
    }
  }

  async function pushLocalStoreToCloud() {
    if (!supabaseClient) throw new Error("Cliente Supabase não configurado.");
    const store = loadLocalStore();
    await enviarLinhasSeguramente(store);
    isCloudConnected = true;
    await pullAllFromCloud();
    return true;
  }

  function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  async function upsertItem(table, item) {
    const store = loadLocalStore();
    const list = store[table] || [];
    const idx = list.findIndex(x => x.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...item };
    } else {
      list.push(item);
    }
    store[table] = list;
    saveLocalStore(store);

    if (supabaseClient && isCloudConnected) {
      if (table === "tabela_valores") {
        await supabaseClient
          .from("tabela_valores")
          .delete()
          .eq("empresa_id", item.empresa_id)
          .eq("cargo_id", item.cargo_id)
          .neq("id", item.id);
      }
      const { error } = await supabaseClient.from(table).upsert(item, { onConflict: "id" });
      if (error) console.error(`Erro ao salvar no Supabase (${table}):`, error.message);
    }
    return item;
  }

  async function deleteItem(table, id) {
    const store = loadLocalStore();
    store[table] = (store[table] || []).filter(x => x.id !== id);
    saveLocalStore(store);

    if (supabaseClient && isCloudConnected) {
      const { error } = await supabaseClient.from(table).delete().eq("id", id);
      if (error) console.error(`Erro ao excluir no Supabase (${table}):`, error.message);
    }
    return true;
  }

  function buscarValorTabela(empresaId, cargoId) {
    const store = loadLocalStore();
    if (!empresaId || !cargoId) return null;
    const item = store.tabela_valores.find(
      v => v.empresa_id === empresaId && v.cargo_id === cargoId
    );
    return item ? Number(item.valor) : null;
  }

  // Cadastrar Novo Colaborador pelo Celular (Nome + Documento + Cargo)
  async function cadastrarColaboradorRapido(nome, cargoId, documento) {
    const store = loadLocalStore();
    const nomeLimpo = String(nome || "").trim();
    const docLimpo = String(documento || "").trim();
    if (!nomeLimpo) throw new Error("Informe o nome do colaborador.");
    if (!docLimpo) throw new Error("Informe o número do documento do colaborador.");
    const cargo = store.cargos.find(c => c.id === cargoId);
    if (!cargo) throw new Error("Selecione o cargo do colaborador.");

    const novoColab = {
      id: generateId("col"),
      nome: nomeLimpo,
      cargo_id: cargo.id,
      cargo_nome: cargo.nome,
      documento: docLimpo,
      telefone: "",
      ativo: true,
      criado_em: new Date().toISOString()
    };

    return await upsertItem("colaboradores", novoColab);
  }

  async function loginUsuario(login, senha, perfilEsperado) {
    if (isCloudConnected) {
      await syncBidirecional();
    }
    const store = loadLocalStore();
    const loginClean = String(login || "").trim().toLowerCase();
    const senhaClean = String(senha || "").trim();

    const user = store.usuarios.find(u => {
      const matchCreds = String(u.login || "").trim().toLowerCase() === loginClean &&
                         String(u.senha || "").trim() === senhaClean &&
                         u.ativo !== false;
      if (!matchCreds) return false;
      if (perfilEsperado === "LANCADOR") {
        return u.perfil === "LANCADOR" || u.perfil === "ADM";
      }
      if (perfilEsperado === "ADM") {
        return u.perfil === "ADM";
      }
      return true;
    });

    if (!user) {
      return { ok: false, message: "Login ou senha inválidos, ou usuário sem permissão para este módulo." };
    }

    const sessionData = {
      id: user.id,
      nome: user.nome,
      login: user.login,
      perfil: user.perfil,
      logado_em: new Date().toISOString()
    };

    const sessionKey = perfilEsperado === "ADM" ? STORAGE_KEYS.SESSION_ADM : STORAGE_KEYS.SESSION_LANCADOR;
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    return { ok: true, user: sessionData };
  }

  function getSessao(perfil) {
    const sessionKey = perfil === "ADM" ? STORAGE_KEYS.SESSION_ADM : STORAGE_KEYS.SESSION_LANCADOR;
    try {
      return JSON.parse(localStorage.getItem(sessionKey) || "null");
    } catch (e) {
      return null;
    }
  }

  function logout(perfil) {
    const sessionKey = perfil === "ADM" ? STORAGE_KEYS.SESSION_ADM : STORAGE_KEYS.SESSION_LANCADOR;
    localStorage.removeItem(sessionKey);
  }

  async function criarLancamento(dados, usuarioSessao) {
    const store = loadLocalStore();
    const colab = store.colaboradores.find(c => c.id === dados.colaborador_id);
    const emp = store.empresas.find(e => e.id === dados.empresa_id);

    if (!colab) throw new Error("Selecione um colaborador válido.");
    if (!emp) throw new Error("Selecione uma empresa válida.");

    const valorTabela = buscarValorTabela(emp.id, colab.cargo_id);
    const valorFinal = Number(dados.valor);
    const alteradoManual = valorTabela !== null && Math.abs(valorFinal - valorTabela) > 0.009;
    const now = new Date().toISOString();

    const novo = {
      id: generateId("lnc"),
      colaborador_id: colab.id,
      colaborador_nome: colab.nome,
      cargo_id: colab.cargo_id || "",
      cargo_nome: colab.cargo_nome || "",
      empresa_id: emp.id,
      empresa_nome: emp.nome,
      data_trabalho: dados.data_trabalho,
      turno: dados.turno,
      motivo: String(dados.motivo || "").trim(),
      valor_tabela: valorTabela !== null ? valorTabela : valorFinal,
      valor: valorFinal,
      valor_alterado_manual: alteradoManual,
      solicitante_id: usuarioSessao.id,
      solicitante_nome: usuarioSessao.nome,
      lancado_por_id: usuarioSessao.id,
      lancado_por_nome: usuarioSessao.nome,
      lancado_por_login: usuarioSessao.login,
      status_lancamento: "ATIVO",
      status_pagamento: "PENDENTE",
      data_pagamento: null,
      fechamento_ref: "",
      conservar_legal: false,
      historico: [
        {
          data: now,
          acao: "CRIAÇÃO",
          usuario: `${usuarioSessao.nome} (${usuarioSessao.login})`,
          detalhes: `Solicitado e lançado por ${usuarioSessao.nome} — R$ ${valorFinal.toFixed(2).replace(".", ",")}${alteradoManual ? ` (Valor tabela era R$ ${valorTabela.toFixed(2).replace(".", ",")})` : " (Valor automático da tabela)"}`
        }
      ],
      criado_em: now,
      atualizado_em: now
    };

    return await upsertItem("lancamentos", novo);
  }

  async function editarLancamento(id, novosDados, motivoAlteracao, usuarioAdm) {
    const store = loadLocalStore();
    const atual = store.lancamentos.find(l => l.id === id);
    if (!atual) throw new Error("Lançamento não encontrado.");

    const colab = store.colaboradores.find(c => c.id === novosDados.colaborador_id) || {
      id: atual.colaborador_id,
      nome: atual.colaborador_nome,
      cargo_id: atual.cargo_id,
      cargo_nome: atual.cargo_nome
    };
    const emp = store.empresas.find(e => e.id === novosDados.empresa_id) || {
      id: atual.empresa_id,
      nome: atual.empresa_nome
    };

    const mudancas = [];
    if (atual.colaborador_id !== colab.id) mudancas.push(`Colaborador: ${atual.colaborador_nome} -> ${colab.nome}`);
    if (atual.empresa_id !== emp.id) mudancas.push(`Empresa: ${atual.empresa_nome} -> ${emp.nome}`);
    if (atual.data_trabalho !== novosDados.data_trabalho) mudancas.push(`Data: ${atual.data_trabalho} -> ${novosDados.data_trabalho}`);
    if (atual.turno !== novosDados.turno) mudancas.push(`Turno: ${atual.turno} -> ${novosDados.turno}`);
    if (Number(atual.valor) !== Number(novosDados.valor)) mudancas.push(`Valor: R$ ${Number(atual.valor).toFixed(2)} -> R$ ${Number(novosDados.valor).toFixed(2)}`);
    if (atual.motivo !== novosDados.motivo) mudancas.push(`Motivo alterado`);

    const now = new Date().toISOString();
    const historico = Array.isArray(atual.historico) ? [...atual.historico] : [];
    historico.push({
      data: now,
      acao: "ALTERAÇÃO ADM",
      usuario: `${usuarioAdm.nome} (${usuarioAdm.login})`,
      detalhes: `${mudancas.join(" | ") || "Dados revisados"}${motivoAlteracao ? ` — Justificativa: ${motivoAlteracao}` : ""}`
    });

    const atualizado = {
      ...atual,
      colaborador_id: colab.id,
      colaborador_nome: colab.nome,
      cargo_id: colab.cargo_id,
      cargo_nome: colab.cargo_nome,
      empresa_id: emp.id,
      empresa_nome: emp.nome,
      data_trabalho: novosDados.data_trabalho,
      turno: novosDados.turno,
      motivo: novosDados.motivo,
      valor: Number(novosDados.valor),
      conservar_legal: Boolean(novosDados.conservar_legal),
      historico,
      atualizado_em: now
    };

    return await upsertItem("lancamentos", atualizado);
  }

  async function alterarStatusLancamento(id, novoStatus, justificativa, usuarioAdm) {
    const store = loadLocalStore();
    const atual = store.lancamentos.find(l => l.id === id);
    if (!atual) throw new Error("Lançamento não encontrado.");

    const now = new Date().toISOString();
    const historico = Array.isArray(atual.historico) ? [...atual.historico] : [];
    historico.push({
      data: now,
      acao: novoStatus === "CANCELADO" ? "CANCELAMENTO" : "REATIVAÇÃO",
      usuario: `${usuarioAdm.nome} (${usuarioAdm.login})`,
      detalhes: justificativa || `Status alterado para ${novoStatus}`
    });

    const atualizado = {
      ...atual,
      status_lancamento: novoStatus,
      historico,
      atualizado_em: now
    };
    return await upsertItem("lancamentos", atualizado);
  }

  async function alterarStatusPagamento(ids, novoStatusPagamento, fechamentoRef, usuarioAdm) {
    const store = loadLocalStore();
    const now = new Date().toISOString();
    const idList = Array.isArray(ids) ? ids : [ids];
    const atualizados = [];

    for (const id of idList) {
      const atual = store.lancamentos.find(l => l.id === id);
      if (!atual || atual.status_lancamento === "CANCELADO") continue;
      if (atual.status_pagamento === novoStatusPagamento && !fechamentoRef) continue;

      const historico = Array.isArray(atual.historico) ? [...atual.historico] : [];
      historico.push({
        data: now,
        acao: novoStatusPagamento === "PAGO" ? "PAGAMENTO REALIZADO" : "PAGAMENTO PENDENTE",
        usuario: `${usuarioAdm.nome} (${usuarioAdm.login})`,
        detalhes: `Marcado como ${novoStatusPagamento}${fechamentoRef ? ` (${fechamentoRef})` : ""}`
      });

      const itemAtualizado = {
        ...atual,
        status_pagamento: novoStatusPagamento,
        data_pagamento: novoStatusPagamento === "PAGO" ? now : null,
        fechamento_ref: fechamentoRef || atual.fechamento_ref || "",
        historico,
        atualizado_em: now
      };
      atualizados.push(itemAtualizado);
    }

    for (const item of atualizados) {
      await upsertItem("lancamentos", item);
    }
    return atualizados.length;
  }

  function analisarRetencao30Dias() {
    const store = loadLocalStore();
    const diasLimite = (window.APP_CONFIG && window.APP_CONFIG.RETENCAO_DIAS) || 30;
    const agoraMs = Date.now();

    const antigos = [];
    const expurgaveis = [];
    const protegidos = [];

    for (const l of store.lancamentos) {
      const criadoMs = new Date(l.criado_em || l.data_trabalho).getTime();
      const idadeDias = Math.floor((agoraMs - criadoMs) / (24 * 60 * 60 * 1000));
      if (idadeDias >= diasLimite) {
        antigos.push({ ...l, idadeDias });
        const temPendencia = l.status_pagamento === "PENDENTE" && l.status_lancamento === "ATIVO";
        const temObrigacaoLegal = Boolean(l.conservar_legal);
        if (temPendencia || temObrigacaoLegal) {
          protegidos.push({
            ...l,
            idadeDias,
            motivoProtecao: temPendencia ? "Pagamento Pendente" : "Retenção Legal / Financeira"
          });
        } else {
          expurgaveis.push({ ...l, idadeDias });
        }
      }
    }

    return {
      diasLimite,
      totalAntigos: antigos.length,
      expurgaveis,
      protegidos
    };
  }

  async function executarExpurgoSeguro(idsParaRemover) {
    for (const id of idsParaRemover) {
      const store = loadLocalStore();
      const item = store.lancamentos.find(l => l.id === id);
      if (!item) continue;
      if (item.status_pagamento === "PENDENTE" && item.status_lancamento === "ATIVO") continue;
      if (item.conservar_legal) continue;
      await deleteItem("lancamentos", id);
    }
    return true;
  }

  window.DB = {
    initDatabase,
    loadLocalStore,
    saveLocalStore,
    pullAllFromCloud,
    pushLocalStoreToCloud,
    syncBidirecional,
    getSupabaseCredentials,
    setSupabaseCredentials,
    isCloud: () => isCloudConnected,
    generateId,
    upsertItem,
    deleteItem,
    buscarValorTabela,
    cadastrarColaboradorRapido,
    loginUsuario,
    getSessao,
    logout,
    criarLancamento,
    editarLancamento,
    alterarStatusLancamento,
    alterarStatusPagamento,
    analisarRetencao30Dias,
    executarExpurgoSeguro
  };
})();
