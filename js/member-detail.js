(() => {
  const MEMBER_ITEMS = {
    "ishii": {
      name: "石井さん",
      roleLabel: "主催者",
      visualVariant: "",
      startedReason: "公園で気軽に楽しめるモルックの雰囲気にひかれ、初めての方も一緒に遊べる場をつくりたいと思ったことがきっかけです。",
      favoriteThings: "散歩、コーヒー、外で過ごす時間。天気の良い日に人が自然と集まる場所が好きです。",
      firstTimerMessage: "ルールを知らなくても大丈夫です。当日は基本から説明するので、まずは見学だけでも気軽に来てください。",
      quote: "初めての方も、まずは見学から気軽にどうぞ。"
    },
    "member-a": {
      name: "運営メンバー A",
      roleLabel: "共同メンバー",
      visualVariant: "soft",
      startedReason: "友人に誘われて参加したイベントで、経験に関係なく盛り上がれるところが楽しく、続けて参加するようになりました。",
      favoriteThings: "音楽、写真、休日のカフェ巡り。活動の日は写真を撮りながら雰囲気を残すことも好きです。",
      firstTimerMessage: "ひとりでの参加でも、その場で自然にチームを組めます。わからないことは近くのメンバーに声をかけてください。",
      quote: "初参加の方が輪に入りやすい雰囲気づくりを大切にしています。"
    },
    "member-b": {
      name: "運営メンバー B",
      roleLabel: "共同メンバー",
      visualVariant: "wood",
      startedReason: "運動が得意でなくても楽しめるスポーツを探していたときにモルックを知り、ほどよい戦略性と気軽さに魅力を感じました。",
      favoriteThings: "ボードゲーム、読書、季節のイベント。ゆっくり会話しながら遊べる時間が好きです。",
      firstTimerMessage: "うまく投げられなくても楽しめるのがモルックの良いところです。まずは一投だけ試す気持ちで参加してください。",
      quote: "勝ち負けよりも、みんなで笑える時間を大事にしています。"
    }
  };

  const MEMBER_DETAIL_FIELDS = [
    ["モルックを始めたきっかけ", "startedReason"],
    ["モルック以外の好きなこと", "favoriteThings"],
    ["初参加者へのメッセージ", "firstTimerMessage"]
  ];

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
      MEMBER_DETAIL_FIELDS.forEach(([label, key]) => {
        const text = item[key];
        if (!text) return;
        const p = document.createElement("p");
        p.textContent = `${label}：${text}`;
        bodyEl.appendChild(p);
      });
      if (item.quote) {
        const q = document.createElement("p");
        q.className = "quote";
        q.textContent = `ひとことコメント：${item.quote}`;
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
