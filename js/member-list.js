// トップページ「運営メンバー」一覧のローカルデータ表示。

import {
  getPublishedMembers,
} from "./member-data.js";

const grid = document.querySelector("[data-member-list]");
let memberVisualObserver;

if (grid) {
  renderMemberCards(getPublishedMembers());
}

function renderMemberCards(items) {
  grid.innerHTML = "";
  items.forEach((item, index) => {
    const link = document.createElement("a");
    link.className = "member-card";
    link.href = `member.html?id=${encodeURIComponent(item.id)}`;
    link.style.setProperty("--member-index", String(index));
    link.innerHTML = `
      <div class="${visualClassName(item)}" aria-hidden="true">${visualHtml(item)}</div>
      <div class="member-card__body">
        <p class="card-kicker">${escapeHtml(item.role || "運営メンバー")}</p>
        <h3>${escapeHtml(item.name)}</h3>
      </div>
    `;
    grid.appendChild(link);
  });
  setupMemberVisualAnimation();
}

function visualClassName(item) {
  const classes = ["person-placeholder"];
  if (item.visualVariant) classes.push(`person-placeholder--${item.visualVariant}`);
  if (item.image) classes.push("person-placeholder--image");
  return classes.join(" ");
}

function visualHtml(item) {
  if (!item.image) return "";
  return `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">`;
}

function setupMemberVisualAnimation() {
  const cards = Array.from(grid.querySelectorAll(".member-card"));
  if (!cards.length) return;

  document.documentElement.classList.add("has-member-visual-animation");
  memberVisualObserver?.disconnect();

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-member-visual-visible"));
    return;
  }

  memberVisualObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-member-visual-visible");
        memberVisualObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.35,
    },
  );

  cards.forEach((card) => memberVisualObserver.observe(card));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
