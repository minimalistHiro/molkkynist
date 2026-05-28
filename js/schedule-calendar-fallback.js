// モジュールJSが動かない環境でも、月間カレンダーの骨組みだけ先に表示する。
(function () {
  const root = document.querySelector("[data-schedule-calendar]");
  if (!root) return;

  const titleEl = root.querySelector("[data-calendar-title]");
  const gridEl = root.querySelector("[data-calendar-grid]");
  const eventsListEl = root.querySelector("[data-calendar-events]");
  const prevButton = root.querySelector("[data-calendar-prev]");
  const nextButton = root.querySelector("[data-calendar-next]");
  const statusEl = root.querySelector("[data-calendar-status]");
  if (!titleEl || !gridEl || !eventsListEl || !prevButton || !nextButton) return;

  const today = startOfDay(new Date());
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  function render() {
    renderTitle();
    renderGrid();
    renderEmptyEventList();
    root.dataset.calendarFallbackRendered = "true";
  }

  function renderTitle() {
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
    });
    titleEl.textContent = formatter.format(cursor);
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i += 1) {
      const dayOffset = i - startWeekday;
      const cellDate = new Date(year, month, 1 + dayOffset);
      const inMonth = cellDate.getMonth() === month;
      const weekday = cellDate.getDay();
      const cell = document.createElement("div");
      cell.className = "schedule-calendar__cell";
      cell.setAttribute("role", "gridcell");

      if (!inMonth) cell.classList.add("schedule-calendar__cell--outside");
      if (weekday === 0) cell.classList.add("schedule-calendar__cell--sun");
      if (weekday === 6) cell.classList.add("schedule-calendar__cell--sat");
      if (sameDay(cellDate, today)) cell.classList.add("schedule-calendar__cell--today");

      const dayEl = document.createElement("span");
      dayEl.className = "schedule-calendar__day";
      dayEl.textContent = String(cellDate.getDate());
      cell.appendChild(dayEl);
      gridEl.appendChild(cell);
    }
  }

  function renderEmptyEventList() {
    eventsListEl.innerHTML = "";
    const li = document.createElement("li");
    li.className = "schedule-calendar__event schedule-calendar__event--empty";
    li.textContent = "イベント情報は管理画面からの登録後に表示されます。";
    eventsListEl.appendChild(li);
    if (statusEl) {
      statusEl.textContent = "";
      statusEl.hidden = true;
    }
  }

  prevButton.addEventListener("click", () => {
    if (root.dataset.calendarModuleActive === "true") return;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    render();
  });

  nextButton.addEventListener("click", () => {
    if (root.dataset.calendarModuleActive === "true") return;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    render();
  });

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function sameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  render();
})();
