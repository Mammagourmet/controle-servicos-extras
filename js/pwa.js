(function () {
  let deferredPrompt = null;

  // Detecta se já está rodando instalado em modo standalone
  function isRunningStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  // Registra o Service Worker do módulo atual (./sw.js)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./" })
        .catch(function () {});
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    document.querySelectorAll(".btn-instalar-app").forEach(function (btn) {
      btn.classList.remove("hidden");
    });
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
  });

  function abrirModalInstalacao(config) {
    let modal = document.getElementById("pwa-install-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "pwa-install-modal";
      modal.className = "modal-backdrop";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-card" style="max-width: 420px; text-align: center;">
        <div style="margin-bottom: 12px;">
          <img src="${config.iconUrl}" alt="${config.shortName}" style="width: 72px; height: 72px; border-radius: 18px; box-shadow: 0 4px 12px rgba(15,23,42,0.18);" />
        </div>
        <h3 style="font-size: 1.12rem; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
          Instalar "${config.shortName}" no Celular
        </h3>
        <p style="font-size: 0.85rem; color: #475569; margin-bottom: 14px;">
          Adicione este ícone na tela inicial do seu celular para abrir direto como aplicativo:
        </p>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 10px;">
          <div style="font-weight: 800; font-size: 0.85rem; color: #1e40af; margin-bottom: 4px;">
            📱 No Android (Chrome / Samsung):
          </div>
          <ol style="font-size: 0.82rem; color: #334155; padding-left: 18px; margin: 0; line-height: 1.45;">
            <li>Toque nos <strong>3 pontinhos (⋮)</strong> no canto superior direito do navegador.</li>
            <li>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
          </ol>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; margin-bottom: 14px;">
          <div style="font-weight: 800; font-size: 0.85rem; color: #0f172a; margin-bottom: 4px;">
            🍎 No iPhone (Safari):
          </div>
          <ol style="font-size: 0.82rem; color: #334155; padding-left: 18px; margin: 0; line-height: 1.45;">
            <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima na barra inferior).</li>
            <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
          </ol>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <a href="${config.iconDownloadUrl}" download="${config.downloadFileName}" class="btn btn-outline btn-sm" style="text-decoration: none; width: 100%;">
            ⬇️ Baixar Imagem do Ícone (${config.downloadFileName})
          </a>
          <button type="button" id="btn-fechar-pwa-modal" class="btn btn-primary" style="width: 100%; background: ${config.themeColor};">
            Entendi / Fechar
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    const btnClose = document.getElementById("btn-fechar-pwa-modal");
    if (btnClose) {
      btnClose.addEventListener("click", function () {
        modal.classList.add("hidden");
      });
    }
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) modal.classList.add("hidden");
    });
  }

  window.initPwaModule = function (config) {
    document.querySelectorAll(".btn-instalar-app").forEach(function (btn) {
      if (isRunningStandalone()) {
        // Se já estiver aberto pelo ícone instalado na tela inicial, ainda permite ver/baixar ícone se clicar
      }
      btn.addEventListener("click", async function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === "accepted") {
            deferredPrompt = null;
          }
        } else {
          abrirModalInstalacao(config);
        }
      });
    });
  };
})();
