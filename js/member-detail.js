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
const HERO_STREAM_ITEM_COUNT = 15;
const HERO_STREAM_DURATION_SECONDS = 46;
const HERO_STREAM_MIN_ITEM_SIZE = 112;
const HERO_STREAM_MAX_ITEM_SIZE = 184;
const HERO_STREAM_VIEWPORT_RATIO = 0.22;
const RELATED_MEMBER_BASE_REPEAT = 12;
const RELATED_MEMBER_CLONE_GROUPS = 5;

let relatedMemberSliderCleanup;

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
  renderRelatedMembers();
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

function renderRelatedMembers() {
  const sectionEl = document.querySelector("[data-related-members]");
  const trackEl = document.querySelector("[data-related-member-track]");
  if (!sectionEl || !trackEl) return;

  relatedMemberSliderCleanup?.();
  relatedMemberSliderCleanup = null;

  const items = getPublishedMembers();
  if (!items.length) {
    sectionEl.hidden = true;
    trackEl.innerHTML = "";
    return;
  }

  trackEl.innerHTML = "";
  const loopItems = createLoopItems(items);
  trackEl.appendChild(createRelatedMemberGroup(loopItems));
  for (let index = 0; index < RELATED_MEMBER_CLONE_GROUPS; index += 1) {
    trackEl.appendChild(createRelatedMemberGroup(loopItems, true));
  }
  sectionEl.hidden = false;
  relatedMemberSliderCleanup = setupRelatedMemberSlider(trackEl);
}

function createLoopItems(items) {
  return Array.from({ length: RELATED_MEMBER_BASE_REPEAT }, () => items).flat();
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

function setupRelatedMemberSlider(trackEl) {
  const viewportEl = trackEl.closest(".member-related__viewport");
  if (!viewportEl) return null;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animationFrameId = 0;
  let loopDistance = 0;
  let currentOffset = 0;
  let slideSpeed = 0;
  let previousTimestamp = null;
  let isDragging = false;
  let isHovered = false;
  let isFocusWithin = false;
  let hasDragged = false;
  let pointerStartX = 0;
  let dragStartOffset = 0;

  trackEl.classList.add("is-js-controlled");
  refreshSliderMetrics();

  function refreshSliderMetrics() {
    const baseGroupEl = trackEl.querySelector(".member-related__group");
    const baseGroupWidth = baseGroupEl?.getBoundingClientRect().width || 0;
    const trackGap = parseFloat(window.getComputedStyle(trackEl).columnGap) || 0;
    loopDistance = baseGroupWidth + trackGap;
    slideSpeed = calculateHeroStreamSpeed();

    if (loopDistance > 0 && slideSpeed > 0) {
      const duration = Math.max(4, loopDistance / slideSpeed);
      trackEl.style.setProperty("--member-related-duration", `${duration.toFixed(2)}s`);
      trackEl.style.setProperty("--member-related-slide-distance", `${loopDistance * -1}px`);
    }

    currentOffset = normalizeRelatedMemberOffset(currentOffset, loopDistance);
    applyRelatedMemberOffset(trackEl, currentOffset);
  }

  function step(timestamp) {
    if (previousTimestamp === null) {
      previousTimestamp = timestamp;
    }

    const elapsed = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    if (!isDragging && !isHovered && !isFocusWithin && !prefersReducedMotion.matches && loopDistance > 0) {
      currentOffset = normalizeRelatedMemberOffset(
        currentOffset - (slideSpeed * elapsed) / 1000,
        loopDistance,
      );
      applyRelatedMemberOffset(trackEl, currentOffset);
    }

    animationFrameId = window.requestAnimationFrame(step);
  }

  function handlePointerDown(event) {
    if (!event.isPrimary || event.button > 0) return;

    isDragging = true;
    hasDragged = false;
    pointerStartX = event.clientX;
    dragStartOffset = currentOffset;
    viewportEl.classList.add("is-dragging");
    viewportEl.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!isDragging || !event.isPrimary) return;

    const deltaX = event.clientX - pointerStartX;
    if (Math.abs(deltaX) > 4) {
      hasDragged = true;
    }

    currentOffset = normalizeRelatedMemberOffset(dragStartOffset + deltaX, loopDistance);
    applyRelatedMemberOffset(trackEl, currentOffset);
  }

  function handlePointerEnd(event) {
    if (!isDragging) return;

    isDragging = false;
    viewportEl.classList.remove("is-dragging");
    viewportEl.releasePointerCapture?.(event.pointerId);
    window.setTimeout(() => {
      hasDragged = false;
    }, 0);
  }

  function handleClick(event) {
    if (!hasDragged) return;

    event.preventDefault();
    event.stopPropagation();
  }

  function handleMouseEnter() {
    isHovered = true;
  }

  function handleMouseLeave() {
    isHovered = false;
  }

  function handleFocusIn() {
    isFocusWithin = true;
  }

  function handleFocusOut() {
    isFocusWithin = false;
  }

  function handleResize() {
    window.requestAnimationFrame(refreshSliderMetrics);
  }

  function handleMotionChange() {
    previousTimestamp = null;
  }

  viewportEl.addEventListener("pointerdown", handlePointerDown);
  viewportEl.addEventListener("pointermove", handlePointerMove);
  viewportEl.addEventListener("pointerup", handlePointerEnd);
  viewportEl.addEventListener("pointercancel", handlePointerEnd);
  viewportEl.addEventListener("mouseenter", handleMouseEnter);
  viewportEl.addEventListener("mouseleave", handleMouseLeave);
  trackEl.addEventListener("click", handleClick, true);
  trackEl.addEventListener("focusin", handleFocusIn);
  trackEl.addEventListener("focusout", handleFocusOut);
  window.addEventListener("resize", handleResize);
  if (typeof prefersReducedMotion.addEventListener === "function") {
    prefersReducedMotion.addEventListener("change", handleMotionChange);
  } else {
    prefersReducedMotion.addListener?.(handleMotionChange);
  }
  animationFrameId = window.requestAnimationFrame(step);

  return () => {
    window.cancelAnimationFrame(animationFrameId);
    viewportEl.removeEventListener("pointerdown", handlePointerDown);
    viewportEl.removeEventListener("pointermove", handlePointerMove);
    viewportEl.removeEventListener("pointerup", handlePointerEnd);
    viewportEl.removeEventListener("pointercancel", handlePointerEnd);
    viewportEl.removeEventListener("mouseenter", handleMouseEnter);
    viewportEl.removeEventListener("mouseleave", handleMouseLeave);
    trackEl.removeEventListener("click", handleClick, true);
    trackEl.removeEventListener("focusin", handleFocusIn);
    trackEl.removeEventListener("focusout", handleFocusOut);
    window.removeEventListener("resize", handleResize);
    if (typeof prefersReducedMotion.removeEventListener === "function") {
      prefersReducedMotion.removeEventListener("change", handleMotionChange);
    } else {
      prefersReducedMotion.removeListener?.(handleMotionChange);
    }
    viewportEl.classList.remove("is-dragging");
    trackEl.classList.remove("is-js-controlled");
    trackEl.style.removeProperty("--member-related-duration");
    trackEl.style.removeProperty("--member-related-offset");
    trackEl.style.removeProperty("--member-related-slide-distance");
  };
}

function calculateHeroStreamSpeed() {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const itemSize = Math.min(
    Math.max(viewportWidth * HERO_STREAM_VIEWPORT_RATIO, HERO_STREAM_MIN_ITEM_SIZE),
    HERO_STREAM_MAX_ITEM_SIZE,
  );
  return (itemSize * HERO_STREAM_ITEM_COUNT) / HERO_STREAM_DURATION_SECONDS;
}

function normalizeRelatedMemberOffset(offset, loopDistance) {
  if (!loopDistance) return offset;

  let normalizedOffset = offset;
  while (normalizedOffset <= -loopDistance) {
    normalizedOffset += loopDistance;
  }
  while (normalizedOffset > 0) {
    normalizedOffset -= loopDistance;
  }
  return normalizedOffset;
}

function applyRelatedMemberOffset(trackEl, offset) {
  trackEl.style.setProperty("--member-related-offset", `${offset}px`);
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
  renderRelatedMembers();
}
