(function () {
  let deferredPrompt = null;

  // Verifica se o sistema já está aberto pelo ícone baixado na tela inicial do celular
  function isRunningStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
  }

  // Registra o Service Worker do módulo atual (./sw.js)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .catch(function () {});
    });
  }

  // NÃO usa e.preventDefault() para não bloquear o menu nativo (3 pontinhos) nem o banner do Chrome no celular
  window.addEventListener("beforeinstallprompt", function (e) {
    deferredPrompt = e;
    atualizarVisibilidadeBotoes();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    if (window.__currentPwaKey) {
      try { localStorage.setItem("pwa_installed_" + window.__currentPwaKey, "1"); } catch (e) {}
    }
    ocultarTodosBotoes();
  });

  function ocultarTodosBotoes() {
    document.querySelectorAll(".btn-instalar-app").forEach(function (btn) {
      btn.classList.add("hidden");
      btn.style.display = "none";
    });
  }

  function atualizarVisibilidadeBotoes() {
    const key = window.__currentPwaKey || "default";
    let jaInstalado = false;
    try {
      jaInstalado = localStorage.getItem("pwa_installed_" + key) === "1";
    } catch (e) {}

    // Se já estiver baixado/aberto pelo atalho do celular, ou se for computador, esconde o botão para não confundir
    if (isRunningStandalone() || jaInstalado || !isMobileDevice()) {
      if (isRunningStandalone()) {
        try { localStorage.setItem("pwa_installed_" + key, "1"); } catch (e) {}
      }
      ocultarTodosBotoes();
      return;
    }

    document.querySelectorAll(".btn-instalar-app").forEach(function (btn) {
      btn.classList.remove("hidden");
      btn.style.display = "inline-flex";
    });
  }

  function abrirModalInstalacao(config) {
    let modal = document.getElementById("pwa-install-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "pwa-install-modal";
      modal.className = "modal-backdrop";
      document.body.appendChild(modal);
    }

    const isWhatsApp = /WhatsApp|Instagram|FBAN|FBAV/i.test(navigator.userAgent || "");

    modal.innerHTML = `
      <div class="modal-box" style="max-width: 400px; text-align: center;">
        <h3 style="font-size: 1.08rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
          Salvar "${config.shortName}" no Celular
        </h3>
        ${isWhatsApp ? `
          <div style="text-align: left; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 10px; padding: 12px; margin-bottom: 12px; font-size: 0.84rem; color: #92400e;">
            <strong>⚠️ Você abriu pelo navegador interno do WhatsApp:</strong><br/>
            Toque nos <strong>3 pontinhos</strong> no canto superior direito e escolha <strong>"Abrir no Chrome"</strong> (Android) ou <strong>"Abrir no Safari"</strong> (iPhone) para salvar na tela inicial.
          </div>
        ` : ""}
        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 10px;">
          <div style="font-weight: 800; font-size: 0.85rem; color: #1e40af; margin-bottom: 4px;">
            📱 No Android (Chrome):
          </div>
          <ol style="font-size: 0.82rem; color: #334155; padding-left: 18px; margin: 0; line-height: 1.45;">
            <li>Toque nos <strong>3 pontinhos (⋮)</strong> na barra superior do Chrome.</li>
            <li>Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
          </ol>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-weight: 800; font-size: 0.85rem; color: #0f172a; margin-bottom: 4px;">
            🍎 No iPhone (Safari):
          </div>
          <ol style="font-size: 0.82rem; color: #334155; padding-left: 18px; margin: 0; line-height: 1.45;">
            <li>Toque no botão <strong>Compartilhar</strong> na barra inferior do Safari.</li>
            <li>Toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
          </ol>
        </div>

        <div style="display: flex; gap: 8px;">
          <button type="button" id="btn-ja-instalei-pwa" class="btn btn-outline btn-sm" style="flex: 1;">
            Já salvei no celular (Não mostrar mais)
          </button>
          <button type="button" id="btn-fechar-pwa-modal" class="btn btn-primary btn-sm" style="background: ${config.themeColor};">
            Fechar
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    document.getElementById("btn-fechar-pwa-modal").addEventListener("click", function () {
      modal.classList.add("hidden");
    });
    document.getElementById("btn-ja-instalei-pwa").addEventListener("click", function () {
      try { localStorage.setItem("pwa_installed_" + (window.__currentPwaKey || "default"), "1"); } catch (e) {}
      modal.classList.add("hidden");
      ocultarTodosBotoes();
    });
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) modal.classList.add("hidden");
    });
  }

  window.initPwaModule = function (config) {
    window.__currentPwaKey = config.appKey || config.shortName || "default";
    atualizarVisibilidadeBotoes();

    document.querySelectorAll(".btn-instalar-app").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === "accepted") {
            deferredPrompt = null;
            try { localStorage.setItem("pwa_installed_" + window.__currentPwaKey, "1"); } catch (e) {}
            ocultarTodosBotoes();
          }
        } else {
          abrirModalInstalacao(config);
        }
      });
    });
  };
})();
