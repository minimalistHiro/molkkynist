// メンバー詳細ページ。
// メンバー情報はFirestoreではなく、ローカルデータから表示する。

import {
  MEMBER_ITEMS,
  getPublishedMembers,
  normalizeMemberItem,
} from "./member-data.js";

const MEMBER_DETAIL_FIELDS = [
  ["職業", "occupation"],
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
  renderRelatedMembers(item.id);
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
    const profileList = document.createElement("dl");
    profileList.className = "member-detail__profile";
    let hasProfileItem = false;

    MEMBER_DETAIL_FIELDS.forEach(([label, key]) => {
      const text = item[key];
      if (!text) return;
      profileList.appendChild(createProfileItem(label, text));
      hasProfileItem = true;
    });
    if (item.comment) {
      profileList.appendChild(
        createProfileItem("ひとことコメント", item.comment, "member-detail__profile-item--comment"),
      );
      hasProfileItem = true;
    }
    if (hasProfileItem) {
      bodyEl.appendChild(profileList);
    }
  }
  if (titleTagEl) {
    titleTagEl.textContent = `${item.name} | メンバー紹介 | Molkkynist`;
  }
}

function createProfileItem(label, text, modifierClass = "") {
  const itemEl = document.createElement("div");
  itemEl.className = ["member-detail__profile-item", modifierClass].filter(Boolean).join(" ");

  const titleEl = document.createElement("dt");
  titleEl.textContent = label;
  itemEl.appendChild(titleEl);

  const textEl = document.createElement("dd");
  textEl.textContent = text;
  itemEl.appendChild(textEl);

  return itemEl;
}

function renderRelatedMembers(currentId) {
  const sectionEl = document.querySelector("[data-related-members]");
  const trackEl = document.querySelector("[data-related-member-track]");
  if (!sectionEl || !trackEl) return;

  const items = shuffleMembers(getPublishedMembers().filter((member) => member.id !== currentId));
  if (!items.length) {
    sectionEl.hidden = true;
    trackEl.innerHTML = "";
    return;
  }

  trackEl.innerHTML = "";
  trackEl.appendChild(createRelatedMemberGroup(items));
  trackEl.appendChild(createRelatedMemberGroup(items, true));
  sectionEl.hidden = false;
}

function createRelatedMemberGroup(items, isClone = false) {
  const list = document.createElement("ul");
  list.className = "member-related__group";
  if (isClone) {
    list.setAttribute("aria-hidden", "true");
  }

  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.className = "member-related__item";

    const link = document.createElement("a");
    link.className = "member-related-card";
    link.href = `member.html?id=${encodeURIComponent(item.id)}`;
    if (isClone) {
      link.tabIndex = -1;
    }
    link.appendChild(createRelatedMemberVisual(item));
    link.appendChild(createRelatedMemberBody(item));

    listItem.appendChild(link);
    list.appendChild(listItem);
  });

  return list;
}

function createRelatedMemberVisual(item) {
  const visual = document.createElement("div");
  visual.className = relatedMemberVisualClassName(item);
  visual.setAttribute("aria-hidden", "true");

  if (item.image) {
    const image = document.createElement("img");
    image.src = item.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    visual.appendChild(image);
  }

  return visual;
}

function createRelatedMemberBody(item) {
  const body = document.createElement("div");
  body.className = "member-related-card__body";

  const role = document.createElement("p");
  role.className = "card-kicker";
  role.textContent = item.role || "運営メンバー";
  body.appendChild(role);

  const name = document.createElement("h3");
  name.textContent = item.name;
  body.appendChild(name);

  return body;
}

function relatedMemberVisualClassName(item) {
  const classes = ["person-placeholder", "member-related-card__visual"];
  if (item.visualVariant) classes.push(`person-placeholder--${item.visualVariant}`);
  if (item.image) classes.push("person-placeholder--image");
  return classes.join(" ");
}

function shuffleMembers(items) {
  return [...items].sort(() => Math.random() - 0.5);
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
  renderRelatedMembers("");
}
