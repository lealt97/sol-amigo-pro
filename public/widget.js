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
  var fallbackMode = script.dataset.mode === "both" ? "both"
    : script.dataset.mode === "modal" ? "modal"
    : "inline";
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

  function clampRadius(value) {
    var numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return 12;
    return Math.round(Math.max(0, Math.min(24, numericValue)));
  }

  function parseCornerRadius(value, referenceSize) {
    if (typeof value !== "string") return null;
    var match = value.trim().match(/^(-?\d+(?:\.\d+)?)(px|%)?/i);
    if (!match) return null;
    var amount = Number(match[1]);
    if (!Number.isFinite(amount) || amount < 0) return null;
    if (match[2] === "%") amount = referenceSize * amount / 100;
    return Math.min(amount, referenceSize / 2);
  }

  function detectHostRadius() {
    if (!window.getComputedStyle || !document.querySelectorAll) return null;
    var selector = [
      "button",
      "input:not([type='hidden']):not([type='checkbox']):not([type='radio'])",
      "select",
      "textarea",
      "[role='button']",
      "a[class*='btn']",
      "a[class*='button']",
    ].join(",");
    var elements;
    try {
      elements = Array.prototype.slice.call(document.querySelectorAll(selector), 0, 100);
    } catch (_error) {
      return null;
    }

    var samples = elements.flatMap(function (element) {
      if (!element || (element.closest && element.closest("[data-sol-amigo-widget], #sol-amigo-widget-trigger"))) return [];
      var rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
      if (!rect || rect.width < 40 || rect.height < 24) return [];
      var style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return [];
      var referenceSize = Math.min(rect.width, rect.height);
      var corners = [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomRightRadius,
        style.borderBottomLeftRadius,
      ].map(function (radius) { return parseCornerRadius(radius, referenceSize); })
        .filter(function (radius) { return radius !== null; });
      if (!corners.length) return [];
      return [Math.min(24, corners.reduce(function (sum, radius) { return sum + radius; }, 0) / corners.length)];
    }).sort(function (a, b) { return a - b; });

    if (!samples.length) return null;
    var middle = Math.floor(samples.length / 2);
    var median = samples.length % 2
      ? samples[middle]
      : (samples[middle - 1] + samples[middle]) / 2;
    return clampRadius(median);
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
    var storedMode = (publicConfig && publicConfig.themeColors && publicConfig.themeColors._widgetMode)
      ? publicConfig.themeColors._widgetMode
      : (publicConfig && publicConfig.widgetMode);

    var mode = script.dataset.mode === "both" || storedMode === "both" ? "both"
      : script.dataset.mode === "modal" || storedMode === "modal" ? "modal"
      : script.dataset.mode === "inline" || storedMode === "inline" ? "inline"
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
    var configuredRadiusMode = publicConfig && publicConfig.borderRadiusMode === "manual"
      ? "manual"
      : publicConfig && publicConfig.themeColors && publicConfig.themeColors._borderRadiusMode === "manual"
      ? "manual"
      : "automatic";
    var configuredRadiusValue = publicConfig && publicConfig.borderRadius !== undefined
      ? publicConfig.borderRadius
      : publicConfig && publicConfig.themeColors
      ? publicConfig.themeColors._borderRadius
      : 12;
    var configuredRadius = clampRadius(configuredRadiusValue);
    var detectedRadius = configuredRadiusMode === "automatic" ? detectHostRadius() : null;
    var formRadius = detectedRadius === null ? configuredRadius : detectedRadius;

    function createFormInstance(isModal) {
      var frameId = "sol-amigo-frame-" + Math.random().toString(36).slice(2);
      var query = new URLSearchParams({
        captacao: token,
        embed: "1",
        widget: "1",
        site_origin: siteOrigin,
      });
      if (isModal) query.set("modal", "1");
      if (hostFont) query.set("site_font", hostFont);
      query.set("site_radius", String(formRadius));
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
      frame.style.borderRadius = Math.min(32, Math.round(formRadius * 2)) + "px";
      frame.style.background = "transparent";

      var shell = document.createElement("div");
      shell.dataset.solAmigoWidget = token;
      shell.style.width = "100%";
      shell.style.maxWidth = "900px";
      shell.style.margin = "0 auto";
      shell.appendChild(frame);

      return { frame: frame, shell: shell };
    }

    var shouldMountInline = (mode === "inline" || mode === "both");
    var shouldMountModal = (mode === "modal" || mode === "both");

    var inlineFrame = null;
    var modalFrame = null;
    var modal = null;
    var openButton = null;
    var widgetTrigger = null;

    function closeModal() {
      if (!modal) return;
      modal.style.display = "none";
      document.body.style.overflow = modal.dataset.previousOverflow || "";
      if (widgetTrigger) widgetTrigger.style.display = "flex";
      if (openButton) openButton.focus();
    }

    if (shouldMountInline) {
      var inlineInstance = createFormInstance(false);
      inlineFrame = inlineInstance.frame;
      if (target) target.appendChild(inlineInstance.shell);
      else script.parentNode.insertBefore(inlineInstance.shell, script.nextSibling);
    }

    if (shouldMountModal) {
      var modalInstance = createFormInstance(true);
      modalFrame = modalInstance.frame;
      var scriptLogo = typeof script.dataset.floatingLogoUrl === "string" ? script.dataset.floatingLogoUrl.trim() : "";
      var configFloatingLogo = "";
      if (publicConfig && typeof publicConfig.floatingButtonLogoUrl === "string" && publicConfig.floatingButtonLogoUrl.trim()) {
        configFloatingLogo = publicConfig.floatingButtonLogoUrl.trim();
      } else if (publicConfig && publicConfig.themeColors && typeof publicConfig.themeColors._floatingButtonLogoUrl === "string" && publicConfig.themeColors._floatingButtonLogoUrl.trim()) {
        configFloatingLogo = publicConfig.themeColors._floatingButtonLogoUrl.trim();
      }
      var configMainLogo = (publicConfig && typeof publicConfig.logoUrl === "string") ? publicConfig.logoUrl.trim() : "";

      var floatingLogoUrl = "";
      // A configuração salva é a fonte oficial. O atributo no script permanece
      // apenas como compatibilidade para instalações antigas/sem configuração.
      if (configFloatingLogo) {
        floatingLogoUrl = configFloatingLogo === "none" ? "" : configFloatingLogo;
      } else if (configMainLogo) {
        floatingLogoUrl = configMainLogo;
      } else if (scriptLogo) {
        floatingLogoUrl = scriptLogo === "none" ? "" : scriptLogo;
      }

      widgetTrigger = document.createElement("div");
      widgetTrigger.id = "sol-amigo-widget-trigger";
      widgetTrigger.style.position = "fixed";
      widgetTrigger.style.right = "24px";
      widgetTrigger.style.bottom = "24px";
      widgetTrigger.style.zIndex = "2147483000";
      widgetTrigger.style.display = "flex";
      widgetTrigger.style.alignItems = "center";
      widgetTrigger.style.justifyContent = "flex-end";
      widgetTrigger.style.pointerEvents = "none";

      var bubble = document.createElement("div");
      bubble.setAttribute("role", "tooltip");
      bubble.style.position = "relative";
      bubble.style.marginRight = "12px";
      bubble.style.background = "#0E2337";
      bubble.style.color = "#FFFFFF";
      bubble.style.padding = "8px 14px";
      bubble.style.borderRadius = "9px";
      bubble.style.border = "none";
      bubble.style.outline = "none";
      bubble.style.fontFamily = hostFont || "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      bubble.style.fontSize = "13px";
      bubble.style.fontWeight = "600";
      bubble.style.lineHeight = "1.3";
      bubble.style.whiteSpace = "nowrap";
      bubble.style.boxShadow = "0 10px 25px -4px rgba(0, 0, 0, 0.4)";
      bubble.style.pointerEvents = "none";
      bubble.style.userSelect = "none";
      bubble.style.opacity = "0";
      bubble.style.transform = "translateX(8px)";
      bubble.style.transition = "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)";
      bubble.textContent = buttonLabel;

      var bubbleArrow = document.createElement("div");
      bubbleArrow.style.position = "absolute";
      bubbleArrow.style.right = "-6px";
      bubbleArrow.style.top = "50%";
      bubbleArrow.style.transform = "translateY(-50%)";
      bubbleArrow.style.width = "0";
      bubbleArrow.style.height = "0";
      bubbleArrow.style.borderTop = "5px solid transparent";
      bubbleArrow.style.borderBottom = "5px solid transparent";
      bubbleArrow.style.borderLeft = "6px solid #0E2337";
      bubble.appendChild(bubbleArrow);

      var buttonBorder = (buttonTextColor === "#FFFFFF" || buttonTextColor.toLowerCase() === "#fff")
        ? "2.5px solid rgba(255, 255, 255, 0.9)"
        : "2.5px solid rgba(14, 35, 55, 0.35)";

      openButton = document.createElement("button");
      openButton.type = "button";
      openButton.setAttribute("data-sol-amigo-floating-btn", "true");
      openButton.setAttribute("aria-label", buttonLabel);
      openButton.style.position = "relative";
      openButton.style.display = "flex";
      openButton.style.alignItems = "center";
      openButton.style.justifyContent = "center";
      openButton.style.width = "56px";
      openButton.style.height = "56px";
      openButton.style.borderRadius = "50%";
      openButton.style.setProperty("background", color, "important");
      openButton.style.setProperty("background-color", color, "important");
      openButton.style.setProperty("color", buttonTextColor, "important");
      openButton.style.border = buttonBorder;
      openButton.style.boxShadow = "0 12px 28px -4px rgba(15, 23, 42, .38), 0 4px 10px -2px rgba(15, 23, 42, .2)";
      openButton.style.cursor = "pointer";
      openButton.style.outline = "none";
      openButton.style.transition = "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease";
      openButton.style.pointerEvents = "auto";

      if (floatingLogoUrl) {
        var logoImg = document.createElement("img");
        logoImg.src = floatingLogoUrl;
        logoImg.alt = publicConfig && publicConfig.companyName ? publicConfig.companyName : "Logotipo";
        logoImg.referrerPolicy = "no-referrer";
        logoImg.style.maxWidth = "66%";
        logoImg.style.maxHeight = "66%";
        logoImg.style.objectFit = "contain";
        logoImg.style.display = "block";
        logoImg.style.pointerEvents = "none";
        logoImg.style.userSelect = "none";
        logoImg.onerror = function() {
          logoImg.style.display = "none";
          if (!openButton.querySelector("svg")) {
            var fallbackSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            fallbackSvg.setAttribute("viewBox", "0 0 24 24");
            fallbackSvg.setAttribute("width", "28");
            fallbackSvg.setAttribute("height", "28");
            fallbackSvg.setAttribute("fill", "none");
            fallbackSvg.setAttribute("stroke", "currentColor");
            fallbackSvg.setAttribute("stroke-width", "2");
            fallbackSvg.setAttribute("stroke-linecap", "round");
            fallbackSvg.setAttribute("stroke-linejoin", "round");
            fallbackSvg.style.display = "block";
            fallbackSvg.innerHTML = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>';
            openButton.appendChild(fallbackSvg);
          }
        };
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

      function showBubble() {
        bubble.style.opacity = "1";
        bubble.style.transform = "translateX(0)";
        openButton.style.transform = "scale(1.1)";
        openButton.style.boxShadow = "0 16px 36px -4px rgba(15, 23, 42, .48), 0 6px 14px -2px rgba(15, 23, 42, .24)";
        openButton.style.setProperty("background", color, "important");
        openButton.style.setProperty("background-color", color, "important");
        openButton.style.setProperty("color", buttonTextColor, "important");
        openButton.style.border = buttonBorder;
      }

      function hideBubble() {
        bubble.style.opacity = "0";
        bubble.style.transform = "translateX(8px)";
        openButton.style.transform = "scale(1)";
        openButton.style.boxShadow = "0 12px 28px -4px rgba(15, 23, 42, .38), 0 4px 10px -2px rgba(15, 23, 42, .2)";
        openButton.style.setProperty("background", color, "important");
        openButton.style.setProperty("background-color", color, "important");
        openButton.style.setProperty("color", buttonTextColor, "important");
        openButton.style.border = buttonBorder;
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

      dialog.appendChild(modalInstance.shell);
      modal.appendChild(dialog);
      widgetTrigger.appendChild(bubble);
      widgetTrigger.appendChild(openButton);
      document.body.appendChild(widgetTrigger);
      document.body.appendChild(modal);

      openButton.addEventListener("click", function () {
        hideBubble();
        if (widgetTrigger) widgetTrigger.style.display = "none";
        modal.dataset.previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        modal.style.display = "block";
      });
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
      if (event.origin !== appOrigin) return;
      var isInline = inlineFrame && event.source === inlineFrame.contentWindow;
      var isModal = modalFrame && event.source === modalFrame.contentWindow;
      if (!isInline && !isModal) return;

      var currentFrame = isInline ? inlineFrame : modalFrame;
      var message = event.data;
      if (!message || typeof message !== "object") return;

      if (message.type === "sol-amigo:resize") {
        var requestedHeight = Number(message.height);
        if (Number.isFinite(requestedHeight) && currentFrame) {
          currentFrame.style.height = Math.max(240, Math.min(1400, Math.ceil(requestedHeight))) + "px";
        }
        return;
      }

      if (message.type === "sol-amigo:close") {
        closeModal();
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
          source: isModal ? "Botão flutuante integrado no site" : "Formulário incorporado no site",
        })),
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            return { ok: response.ok, body: body };
          });
        })
        .then(function (result) {
          if (event.source && typeof event.source.postMessage === "function") {
            event.source.postMessage({
              type: "sol-amigo:result",
              success: result.ok && result.body.success === true,
              error: result.ok ? null : (result.body.error || "Não foi possível enviar seus dados."),
            }, appOrigin);
          }
        })
        .catch(function () {
          if (event.source && typeof event.source.postMessage === "function") {
            event.source.postMessage({
              type: "sol-amigo:result",
              success: false,
              error: "Não foi possível conectar ao formulário. Tente novamente.",
            }, appOrigin);
          }
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
