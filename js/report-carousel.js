(() => {
  const carousels = document.querySelectorAll("[data-report-carousel]");

  if (!carousels.length) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  carousels.forEach((root) => {
    const viewport = root.querySelector(".report-carousel__viewport");
    const track = root.querySelector("[data-report-carousel-track]");
    const slides = track ? Array.from(track.children) : [];

    if (!viewport || !track || slides.length === 0) {
      return;
    }

    const interval = Number(root.dataset.interval) || 5000;

    let visibleCount = getVisibleCount();
    let pageCount = computePageCount(visibleCount);
    let currentIndex = 0;
    let timerId = null;

    function getVisibleCount() {
      const width = window.innerWidth;
      if (width <= 680) return 1;
      if (width <= 981) return 2;
      return 3;
    }

    function isPeekMode() {
      return visibleCount === 1;
    }

    function computePageCount(visible) {
      if (visible === 1) {
        return slides.length;
      }
      return Math.max(1, slides.length - visible + 1);
    }

    function getGap() {
      const styles = window.getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || "0");
      return Number.isNaN(gap) ? 0 : gap;
    }

    function update() {
      const slideWidth = slides[0].getBoundingClientRect().width;
      const gap = getGap();
      const viewportWidth = viewport.getBoundingClientRect().width;
      const centerOffset = isPeekMode()
        ? (viewportWidth - slideWidth) / 2
        : 0;
      const offset = currentIndex * (slideWidth + gap) - centerOffset;
      track.style.transform = `translateX(${-offset}px)`;

      root.classList.toggle("report-carousel--peek", isPeekMode());

      slides.forEach((slide, i) => {
        let isVisible;
        if (isPeekMode()) {
          isVisible = i === currentIndex;
          slide.classList.toggle("is-active", isVisible);
        } else {
          isVisible = i >= currentIndex && i < currentIndex + visibleCount;
          slide.classList.remove("is-active");
        }
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
      visibleCount = getVisibleCount();
      pageCount = computePageCount(visibleCount);
      if (currentIndex > pageCount - 1) {
        currentIndex = pageCount - 1;
      }
      update();
    }

    slides.forEach((slide, i) => {
      slide.addEventListener("click", (event) => {
        if (!isPeekMode()) return;
        if (i === currentIndex) return;
        event.preventDefault();
        goTo(i);
        restartTimer();
      });
    });

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

    update();
    startTimer();
  });
})();
