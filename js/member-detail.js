// メンバー詳細ページ。
// メンバー情報はFirestoreではなく、ローカルデータから表示する。

import {
  MEMBER_ITEMS,
  normalizeMemberItem,
} from "./member-data.js";

const MEMBER_DETAIL_FIELDS = [
  ["モルックを始めたきっかけ", "startedReason"],
  ["モルック以外の好きなこと", "favoriteThings"],
  ["初参加者へのメッセージ", "firstTimerMessage"],
];

initMemberDetail().catch((error) => {
  console.error("[member-detail] 初期化に失敗しました", error);
  renderNotFound();
});

async function initMemberDetail() {
  const id = getId();
  if (!id) {
    renderNotFound();
    return;
  }

  const item = normalizeMemberItem(id, MEMBER_ITEMS[id]);
  if (!item || !item.isPublished) {
    renderNotFound();
    return;
  }

  render(item);
}

function getId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? id.trim() : "";
}

function render(item) {
  const nameEl = document.querySelector("[data-member-name]");
  const roleEl = document.querySelector("[data-member-role]");
  const visualEl = document.querySelector("[data-member-visual]");
  const bodyEl = document.querySelector("[data-member-body]");
  const titleTagEl = document.querySelector("[data-member-page-title]");

  if (nameEl) nameEl.textContent = item.name;
  if (roleEl) roleEl.textContent = item.role || "運営メンバー";
  renderVisual(visualEl, item);

  if (bodyEl) {
    bodyEl.innerHTML = "";
    MEMBER_DETAIL_FIELDS.forEach(([label, key]) => {
      const text = item[key];
      if (!text) return;
      const p = document.createElement("p");
      p.textContent = `${label}：${text}`;
      bodyEl.appendChild(p);
    });
    if (item.comment) {
      const q = document.createElement("p");
      q.className = "quote";
      q.textContent = `ひとことコメント：${item.comment}`;
      bodyEl.appendChild(q);
    }
  }
  if (titleTagEl) {
    titleTagEl.textContent = `${item.name} | メンバー紹介 | Molkkynist`;
  }
}

function renderVisual(visualEl, item) {
  if (!visualEl) return;
  visualEl.classList.remove(
    "member-detail__visual--soft",
    "member-detail__visual--wood",
    "member-detail__visual--image"
  );
  visualEl.innerHTML = "";
  if (item.visualVariant) {
    visualEl.classList.add(`member-detail__visual--${item.visualVariant}`);
  }
  if (item.image) {
    visualEl.classList.add("member-detail__visual--image");
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    visualEl.appendChild(image);
  }
}

function renderNotFound() {
  const nameEl = document.querySelector("[data-member-name]");
  const roleEl = document.querySelector("[data-member-role]");
  const bodyEl = document.querySelector("[data-member-body]");
  const titleTagEl = document.querySelector("[data-member-page-title]");
  const visualEl = document.querySelector("[data-member-visual]");

  if (nameEl) nameEl.textContent = "メンバーが見つかりませんでした";
  if (roleEl) roleEl.textContent = "";
  if (visualEl) visualEl.innerHTML = "";
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
