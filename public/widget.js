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
  var fallbackMode = script.dataset.mode === "modal" ? "modal" : "inline";
  var fallbackColor = /^#[0-9a-f]{6}$/i.test(script.dataset.color || "")
    ? script.dataset.color
    : "#0076DD";
  var fallbackButtonLabel = (script.dataset.buttonLabel || "Simular economia solar").slice(0, 60);
  var siteOrigin = window.location.origin;

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

  function detectHostFont(target) {
    var source = target || script.parentElement || document.body || document.documentElement;
    if (!source || !window.getComputedStyle) return "";
    var family = window.getComputedStyle(source).fontFamily || "";
    family = family.trim().slice(0, 200);
    return /^[\p{L}\p{N}\s,'"-]+$/u.test(family) ? family : "";
  }

  function relativeLuminance(hex) {
    var channels = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map(function (value) {
      var channel = parseInt(value, 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function readableTextColor(background) {
    var luminance = relativeLuminance(background);
    var darkLuminance = relativeLuminance("#0B1725");
    var darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
    var lightContrast = 1.05 / (luminance + 0.05);
    return darkContrast >= lightContrast ? "#0B1725" : "#FFFFFF";
  }

  function initializeWidget(publicConfig) {
    var mode = publicConfig && publicConfig.widgetMode === "modal" ? "modal"
      : publicConfig && publicConfig.widgetMode === "inline" ? "inline"
      : fallbackMode;
    var detailedTheme = publicConfig && publicConfig.colorMode === "detailed" && publicConfig.themeColors
      ? publicConfig.themeColors
      : null;
    var color = detailedTheme && /^#[0-9a-f]{6}$/i.test(detailedTheme.primaryButtonBackground || "")
      ? detailedTheme.primaryButtonBackground
      : publicConfig && /^#[0-9a-f]{6}$/i.test(publicConfig.primaryColor || "")
      ? publicConfig.primaryColor
      : fallbackColor;
    var buttonTextColor = detailedTheme && /^#[0-9a-f]{6}$/i.test(detailedTheme.primaryButtonText || "")
      ? detailedTheme.primaryButtonText
      : readableTextColor(color);
    var buttonLabel = publicConfig && typeof publicConfig.submitLabel === "string" && publicConfig.submitLabel.trim()
      ? publicConfig.submitLabel.trim().slice(0, 60)
      : fallbackButtonLabel;
    var target = findTarget();
    var hostFont = detectHostFont(target);
    var frameId = "sol-amigo-frame-" + Math.random().toString(36).slice(2);
    var query = new URLSearchParams({
      captacao: token,
      embed: "1",
      widget: "1",
      site_origin: siteOrigin,
    });
    if (hostFont) query.set("site_font", hostFont);
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

  function closeModal() {
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = modal.dataset.previousOverflow || "";
    if (openButton) openButton.focus();
  }

  if (mode === "inline") {
    if (target) target.appendChild(shell);
    else script.parentNode.insertBefore(shell, script.nextSibling);
  } else {
    var floatingLogoUrl = (publicConfig && (publicConfig.floatingButtonLogoUrl || publicConfig.logoUrl)) || script.dataset.floatingLogoUrl || "";
    openButton = document.createElement("button");
    openButton.type = "button";
    openButton.setAttribute("aria-haspopup", "dialog");
    openButton.setAttribute("aria-label", buttonLabel);
    openButton.style.position = "fixed";
    openButton.style.right = "24px";
    openButton.style.bottom = "24px";
    openButton.style.zIndex = "2147483000";
    openButton.style.width = "60px";
    openButton.style.height = "60px";
    openButton.style.minWidth = "60px";
    openButton.style.minHeight = "60px";
    openButton.style.padding = "0";
    openButton.style.border = "0";
    openButton.style.borderRadius = "50%";
    openButton.style.background = color;
    openButton.style.color = buttonTextColor;
    openButton.style.display = "flex";
    openButton.style.alignItems = "center";
    openButton.style.justifyContent = "center";
    openButton.style.boxShadow = "0 12px 28px -4px rgba(15, 23, 42, .38), 0 4px 10px -2px rgba(15, 23, 42, .2)";
    openButton.style.cursor = "pointer";
    openButton.style.transition = "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease";
    openButton.style.outline = "none";
    openButton.style.overflow = "hidden";

    if (floatingLogoUrl) {
      var logoImg = document.createElement("img");
      logoImg.src = floatingLogoUrl;
      logoImg.alt = publicConfig && publicConfig.companyName ? publicConfig.companyName : "Logotipo";
      logoImg.style.maxWidth = "66%";
      logoImg.style.maxHeight = "66%";
      logoImg.style.objectFit = "contain";
      logoImg.style.display = "block";
      logoImg.style.pointerEvents = "none";
      logoImg.style.userSelect = "none";
      openButton.appendChild(logoImg);
    } else {
      var sunSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sunSvg.setAttribute("viewBox", "0 0 24 24");
      sunSvg.setAttribute("width", "28");
      sunSvg.setAttribute("height", "28");
      sunSvg.setAttribute("fill", "none");
      sunSvg.setAttribute("stroke", "currentColor");
      sunSvg.setAttribute("stroke-width", "2");
      sunSvg.setAttribute("stroke-linecap", "round");
      sunSvg.setAttribute("stroke-linejoin", "round");
      sunSvg.style.display = "block";
      sunSvg.style.pointerEvents = "none";
      sunSvg.innerHTML = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';
      openButton.appendChild(sunSvg);
    }

    var bubble = document.createElement("div");
    bubble.setAttribute("role", "tooltip");
    bubble.style.position = "fixed";
    bubble.style.right = "94px";
    bubble.style.bottom = "36px";
    bubble.style.zIndex = "2147483000";
    bubble.style.background = "#0E2337";
    bubble.style.color = "#FFFFFF";
    bubble.style.padding = "8px 14px";
    bubble.style.borderRadius = "9px";
    bubble.style.fontFamily = hostFont || "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    bubble.style.fontSize = "13px";
    bubble.style.fontWeight = "600";
    bubble.style.lineHeight = "1.3";
    bubble.style.whiteSpace = "nowrap";
    bubble.style.boxShadow = "0 10px 25px -4px rgba(0, 0, 0, 0.35)";
    bubble.style.pointerEvents = "none";
    bubble.style.userSelect = "none";
    bubble.style.opacity = "0";
    bubble.style.transform = "translateX(8px)";
    bubble.style.transition = "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
    bubble.textContent = buttonLabel;

    var bubbleArrow = document.createElement("div");
    bubbleArrow.style.position = "absolute";
    bubbleArrow.style.top = "50%";
    bubbleArrow.style.right = "-6px";
    bubbleArrow.style.marginTop = "-5px";
    bubbleArrow.style.width = "0";
    bubbleArrow.style.height = "0";
    bubbleArrow.style.borderTop = "5px solid transparent";
    bubbleArrow.style.borderBottom = "5px solid transparent";
    bubbleArrow.style.borderLeft = "6px solid #0E2337";
    bubble.appendChild(bubbleArrow);

    function showBubble() {
      bubble.style.opacity = "1";
      bubble.style.transform = "translateX(0)";
      openButton.style.transform = "scale(1.08)";
    }

    function hideBubble() {
      bubble.style.opacity = "0";
      bubble.style.transform = "translateX(8px)";
      openButton.style.transform = "scale(1)";
    }

    openButton.addEventListener("mouseenter", showBubble);
    openButton.addEventListener("mouseleave", hideBubble);
    openButton.addEventListener("focus", showBubble);
    openButton.addEventListener("blur", hideBubble);

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
    closeButton.style.fontFamily = hostFont || "ui-sans-serif, system-ui, sans-serif";
    closeButton.style.fontSize = "25px";
    closeButton.style.fontWeight = "400";
    closeButton.style.lineHeight = "1";
    closeButton.style.cursor = "pointer";

    dialog.appendChild(closeButton);
    dialog.appendChild(shell);
    modal.appendChild(dialog);
    document.body.appendChild(openButton);
    document.body.appendChild(modal);

    openButton.addEventListener("click", function () {
      hideBubble();
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
        frame.style.height = Math.max(240, Math.min(1400, Math.ceil(requestedHeight))) + "px";
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
  }

  var configUrl = new URL(endpoint);
  configUrl.searchParams.set("formToken", token);
  configUrl.searchParams.set("siteOrigin", siteOrigin);

  fetch(configUrl, {
    method: "GET",
    credentials: "omit",
    cache: "no-store",
    referrerPolicy: "strict-origin-when-cross-origin",
  })
    .then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.error || "Formulário indisponível.");
        return body;
      });
    })
    .then(initializeWidget)
    .catch(function (error) {
      console.warn("Sol Amigo PRO: " + (error && error.message ? error.message : "não foi possível carregar a configuração do formulário."));
    });
})();
