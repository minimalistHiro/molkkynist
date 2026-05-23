(() => {
  const carousels = document.querySelectorAll("[data-report-carousel]");

  if (!carousels.length) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  carousels.forEach((root) => {
    const track = root.querySelector("[data-report-carousel-track]");
    const slides = track ? Array.from(track.children) : [];

    if (!track || slides.length === 0) {
      return;
    }

    const prevButton = root.querySelector("[data-report-carousel-prev]");
    const nextButton = root.querySelector("[data-report-carousel-next]");
    const dotsContainer = root.querySelector("[data-report-carousel-dots]");
    const interval = Number(root.dataset.interval) || 5000;

    let visibleCount = getVisibleCount();
    let pageCount = Math.max(1, slides.length - visibleCount + 1);
    let currentIndex = 0;
    let timerId = null;

    function getVisibleCount() {
      const width = window.innerWidth;
      if (width <= 680) return 1;
      if (width <= 981) return 2;
      return 3;
    }

    function getGap() {
      const styles = window.getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || "0");
      return Number.isNaN(gap) ? 0 : gap;
    }

    function update() {
      if (slides.length === 0) return;
      const slideWidth = slides[0].getBoundingClientRect().width;
      const gap = getGap();
      const offset = currentIndex * (slideWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;

      const dots = dotsContainer ? Array.from(dotsContainer.children) : [];
      dots.forEach((dot, i) => {
        const isActive = i === currentIndex;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
        dot.setAttribute("tabindex", isActive ? "0" : "-1");
      });

      slides.forEach((slide, i) => {
        const isVisible = i >= currentIndex && i < currentIndex + visibleCount;
        slide.setAttribute("aria-hidden", String(!isVisible));
      });
    }

    function goTo(index) {
      if (pageCount <= 0) return;
      currentIndex = ((index % pageCount) + pageCount) % pageCount;
      update();
    }

    function next() {
      goTo(currentIndex + 1);
    }

    function prev() {
      goTo(currentIndex - 1);
    }

    function buildDots() {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = "";
      for (let i = 0; i < pageCount; i += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "report-carousel__dot";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", `${i + 1}番目のレポートを表示`);
        dot.addEventListener("click", () => {
          goTo(i);
          restartTimer();
        });
        dotsContainer.appendChild(dot);
      }
    }

    function startTimer() {
      if (reducedMotion.matches) return;
      if (pageCount <= 1) return;
      stopTimer();
      timerId = window.setInterval(next, interval);
    }

    function stopTimer() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    function restartTimer() {
      stopTimer();
      startTimer();
    }

    function rebuild() {
      const previousVisibleCount = visibleCount;
      visibleCount = getVisibleCount();
      pageCount = Math.max(1, slides.length - visibleCount + 1);
      if (currentIndex > pageCount - 1) {
        currentIndex = pageCount - 1;
      }
      if (previousVisibleCount !== visibleCount) {
        buildDots();
      }
      update();
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        prev();
        restartTimer();
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        next();
        restartTimer();
      });
    }

    root.addEventListener("mouseenter", stopTimer);
    root.addEventListener("mouseleave", startTimer);
    root.addEventListener("focusin", stopTimer);
    root.addEventListener("focusout", startTimer);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    window.addEventListener("resize", () => {
      rebuild();
    });

    reducedMotion.addEventListener("change", () => {
      if (reducedMotion.matches) {
        stopTimer();
      } else {
        startTimer();
      }
    });

    buildDots();
    update();
    startTimer();
  });
})();
