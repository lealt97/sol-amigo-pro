(function () {
  "use strict";

  var script = document.currentScript;
  if (!script || script.dataset.solAmigoLoaded === "true") return;
  script.dataset.solAmigoLoaded = "true";

  var token = (script.dataset.solAmigoToken || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    console.warn("Sol Amigo PRO: identificador do formulário ausente ou inválido.");
    return;
  }

  var scriptUrl = new URL(script.src, window.location.href);
  var appBase = new URL("./", scriptUrl).toString();
  var appOrigin = scriptUrl.origin;
  var endpoint = "https://tmdhmthlnfotfezxgxlt.supabase.co/functions/v1/capture-lead";
  var mode = script.dataset.mode === "modal" ? "modal" : "inline";
  var color = /^#[0-9a-f]{6}$/i.test(script.dataset.color || "")
    ? script.dataset.color
    : "#0076DD";
  var buttonLabel = (script.dataset.buttonLabel || "Simular economia solar").slice(0, 60);
  var frameId = "sol-amigo-frame-" + Math.random().toString(36).slice(2);
  var siteOrigin = window.location.origin;
  var query = new URLSearchParams({
    captacao: token,
    embed: "1",
    widget: "1",
    site_origin: siteOrigin,
  });
  var frameUrl = appBase + "?" + query.toString();

  var frame = document.createElement("iframe");
  frame.id = frameId;
  frame.title = "Formulário de simulação de energia solar";
  frame.src = frameUrl;
  frame.loading = "lazy";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.setAttribute("sandbox", "allow-forms allow-scripts allow-same-origin");
  frame.setAttribute("allow", "clipboard-write");
  frame.style.display = "block";
  frame.style.width = "100%";
  frame.style.height = "760px";
  frame.style.border = "0";
  frame.style.borderRadius = "18px";
  frame.style.background = "transparent";

  var shell = document.createElement("div");
  shell.dataset.solAmigoWidget = token;
  shell.style.width = "100%";
  shell.style.maxWidth = "900px";
  shell.style.margin = "0 auto";
  shell.appendChild(frame);

  var modal = null;
  var openButton = null;

  function findTarget() {
    var selector = script.dataset.target;
    if (!selector) return null;
    try {
      return document.querySelector(selector);
    } catch (_error) {
      console.warn("Sol Amigo PRO: seletor de destino inválido.");
      return null;
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = modal.dataset.previousOverflow || "";
    if (openButton) openButton.focus();
  }

  if (mode === "inline") {
    var target = findTarget();
    if (target) target.appendChild(shell);
    else script.parentNode.insertBefore(shell, script.nextSibling);
  } else {
    openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = buttonLabel;
    openButton.setAttribute("aria-haspopup", "dialog");
    openButton.style.position = "fixed";
    openButton.style.right = "24px";
    openButton.style.bottom = "24px";
    openButton.style.zIndex = "2147483000";
    openButton.style.minHeight = "48px";
    openButton.style.padding = "0 20px";
    openButton.style.border = "0";
    openButton.style.borderRadius = "999px";
    openButton.style.background = color;
    openButton.style.color = "#fff";
    openButton.style.font = "700 14px/1.2 ui-sans-serif, system-ui, sans-serif";
    openButton.style.boxShadow = "0 14px 35px rgba(15, 23, 42, .28)";
    openButton.style.cursor = "pointer";

    modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Simulação de energia solar");
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "2147483001";
    modal.style.padding = "20px";
    modal.style.background = "rgba(14, 35, 55, .72)";
    modal.style.backdropFilter = "blur(5px)";
    modal.style.overflowY = "auto";

    var dialog = document.createElement("div");
    dialog.style.position = "relative";
    dialog.style.width = "min(900px, 100%)";
    dialog.style.margin = "20px auto";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Fechar formulário");
    closeButton.style.position = "absolute";
    closeButton.style.top = "10px";
    closeButton.style.right = "12px";
    closeButton.style.zIndex = "2";
    closeButton.style.width = "36px";
    closeButton.style.height = "36px";
    closeButton.style.border = "0";
    closeButton.style.borderRadius = "50%";
    closeButton.style.background = "rgba(14, 35, 55, .9)";
    closeButton.style.color = "#fff";
    closeButton.style.font = "400 25px/1 ui-sans-serif, system-ui, sans-serif";
    closeButton.style.cursor = "pointer";

    dialog.appendChild(closeButton);
    dialog.appendChild(shell);
    modal.appendChild(dialog);
    document.body.appendChild(openButton);
    document.body.appendChild(modal);

    openButton.addEventListener("click", function () {
      modal.dataset.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      modal.style.display = "block";
      closeButton.focus();
    });
    closeButton.addEventListener("click", closeModal);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modal.style.display !== "none") closeModal();
    });
  }

  function utmContext() {
    var params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source"),
      utmMedium: params.get("utm_medium"),
      utmCampaign: params.get("utm_campaign"),
      utmContent: params.get("utm_content"),
      utmTerm: params.get("utm_term"),
    };
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== appOrigin || event.source !== frame.contentWindow) return;
    var message = event.data;
    if (!message || typeof message !== "object") return;

    if (message.type === "sol-amigo:resize") {
      var requestedHeight = Number(message.height);
      if (Number.isFinite(requestedHeight)) {
        frame.style.height = Math.max(520, Math.min(1400, requestedHeight)) + "px";
      }
      return;
    }

    if (message.type !== "sol-amigo:submit" || message.formToken !== token) return;
    var payload = message.payload && typeof message.payload === "object" ? message.payload : {};

    fetch(endpoint, {
      method: "POST",
      credentials: "omit",
      referrerPolicy: "strict-origin-when-cross-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({}, payload, utmContext(), {
        formToken: token,
        siteOrigin: siteOrigin,
        landingPage: window.location.href.slice(0, 500),
        source: "Formulário integrado no site",
      })),
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          return { ok: response.ok, body: body };
        });
      })
      .then(function (result) {
        frame.contentWindow.postMessage({
          type: "sol-amigo:result",
          success: result.ok && result.body.success === true,
          error: result.ok ? null : (result.body.error || "Não foi possível enviar seus dados."),
        }, appOrigin);
      })
      .catch(function () {
        frame.contentWindow.postMessage({
          type: "sol-amigo:result",
          success: false,
          error: "Não foi possível conectar ao formulário. Tente novamente.",
        }, appOrigin);
      });
  });
})();
