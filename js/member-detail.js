(() => {
  const MEMBER_ITEMS = {
    "ishii": {
      name: "石井さん",
      roleLabel: "主催者",
      visualVariant: "",
      paragraphs: [
        "Molkkynistの活動を企画・運営する中心メンバーです。正式な紹介文は後日掲載します。",
        "初めての方が安心して輪に入れるよう、当日の進行やルール説明を担当することが多いです。"
      ],
      quote: "初めての方も、まずは見学から気軽にどうぞ。"
    },
    "member-a": {
      name: "運営メンバー A",
      roleLabel: "共同メンバー",
      visualVariant: "soft",
      paragraphs: [
        "イベント進行や参加者サポートを担当する想定の掲載枠です。",
        "正式なプロフィール文と写真は、公開前に確認したうえで差し替えます。"
      ],
      quote: "ルール説明やチーム分けをサポートします。"
    },
    "member-b": {
      name: "運営メンバー B",
      roleLabel: "共同メンバー",
      visualVariant: "wood",
      paragraphs: [
        "活動レポートや写真整理を担当する想定の掲載枠です。",
        "正式なプロフィール文と写真は、公開前に確認したうえで差し替えます。"
      ],
      quote: "当日の雰囲気が伝わる更新を準備します。"
    }
  };

  function getId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id && Object.prototype.hasOwnProperty.call(MEMBER_ITEMS, id) ? id : null;
  }

  function render(item) {
    const nameEl = document.querySelector("[data-member-name]");
    const roleEl = document.querySelector("[data-member-role]");
    const visualEl = document.querySelector("[data-member-visual]");
    const bodyEl = document.querySelector("[data-member-body]");
    const titleTagEl = document.querySelector("[data-member-page-title]");

    if (nameEl) nameEl.textContent = item.name;
    if (roleEl) roleEl.textContent = item.roleLabel;
    if (visualEl) {
      visualEl.classList.remove(
        "member-detail__visual--soft",
        "member-detail__visual--wood"
      );
      if (item.visualVariant) {
        visualEl.classList.add(`member-detail__visual--${item.visualVariant}`);
      }
    }
    if (bodyEl) {
      bodyEl.innerHTML = "";
      item.paragraphs.forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        bodyEl.appendChild(p);
      });
      if (item.quote) {
        const q = document.createElement("p");
        q.className = "quote";
        q.textContent = item.quote;
        bodyEl.appendChild(q);
      }
    }
    if (titleTagEl) {
      titleTagEl.textContent = `${item.name} | メンバー紹介 | Molkkynist`;
    }
  }

  function renderNotFound() {
    const nameEl = document.querySelector("[data-member-name]");
    const roleEl = document.querySelector("[data-member-role]");
    const bodyEl = document.querySelector("[data-member-body]");
    const titleTagEl = document.querySelector("[data-member-page-title]");

    if (nameEl) nameEl.textContent = "メンバーが見つかりませんでした";
    if (roleEl) roleEl.textContent = "";
    if (bodyEl) {
      bodyEl.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = "指定されたメンバーが存在しないか、URLが正しくない可能性があります。メンバー一覧からもう一度お選びください。";
      bodyEl.appendChild(p);
    }
    if (titleTagEl) {
      titleTagEl.textContent = "メンバーが見つかりません | Molkkynist";
    }
  }

  const id = getId();
  if (id) {
    render(MEMBER_ITEMS[id]);
  } else {
    renderNotFound();
  }
})();
