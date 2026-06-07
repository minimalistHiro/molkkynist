(() => {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-nav");
  const toggleLabel = toggle?.querySelector(".visually-hidden");

  if (!toggle || !nav) {
    return;
  }

  const setupMobileMenuContent = () => {
    if (nav.querySelector(".site-nav__panel")) {
      return;
    }

    const links = document.createElement("div");
    links.className = "site-nav__links";

    Array.from(nav.children).forEach((child) => {
      if (child instanceof HTMLAnchorElement) {
        links.appendChild(child);
      }
    });

    const panel = document.createElement("div");
    panel.className = "site-nav__panel";

    const actions = document.createElement("div");
    actions.className = "site-nav__actions";

    const cta = document.createElement("a");
    cta.className = "button button--pill-large button--green site-nav__cta";
    cta.href = location.pathname.endsWith("/") || location.pathname.endsWith("index.html")
      ? "#schedule"
      : "index.html#schedule";
    cta.textContent = "イベントに参加する";

    const social = document.createElement("div");
    social.className = "site-nav__social";
    social.setAttribute("aria-label", "SNSリンク");

    [
      ["X（仮リンク）", "assets/images/social/x.svg", "#", false],
      ["Instagram", "assets/images/social/instagram.svg", "https://www.instagram.com/molkkynist?igsh=MXYyZGVycGxtajh3aA==", true],
      ["LINE（仮リンク）", "assets/images/social/line.svg", "#", false],
    ].forEach(([label, src, href, isExternal]) => {
      const link = document.createElement("a");
      link.className = "social-link";
      link.href = href;
      link.setAttribute("aria-label", label);
      if (isExternal) {
        link.target = "_blank";
        link.rel = "noopener";
      }

      const icon = document.createElement("img");
      icon.className = "social-link__icon";
      icon.src = src;
      icon.alt = "";
      icon.width = 22;
      icon.height = 22;

      link.appendChild(icon);
      social.appendChild(link);
    });

    actions.append(cta, social);
    panel.append(links, actions);
    nav.appendChild(panel);
  };

  const setOpen = (isOpen) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    nav.classList.toggle("is-open", isOpen);
    document.body.classList.toggle("nav-open", isOpen);

    if (toggleLabel) {
      toggleLabel.textContent = isOpen ? "メニューを閉じる" : "メニューを開く";
    }
  };

  setupMobileMenuContent();
  if (toggleLabel) {
    toggleLabel.textContent = "メニューを開く";
  }

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  nav.addEventListener("click", (event) => {
    if (event.target === nav) {
      setOpen(false);
      return;
    }

    if (event.target instanceof HTMLAnchorElement) {
      setOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Node)) {
      return;
    }

    if (!nav.contains(target) && !toggle.contains(target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 981px)").matches) {
      setOpen(false);
    }
  });
})();
