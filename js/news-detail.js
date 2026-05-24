(() => {
  const NEWS_ITEMS = {
    "001": {
      title: "公式サイトを公開しました",
      dateText: "2026年5月20日",
      dateTime: "2026-05-20",
      visualVariant: "",
      paragraphs: [
        "Molkkynistの公式サイトを公開しました。これまで Instagram を中心に発信してきた活動情報を、より多くの方に届けるための拠点としてサイトを整備しました。",
        "イベント情報、活動レポート、運営メンバーの紹介、参加の流れなどを順次拡充していきます。参加希望や見学のご相談は、お問い合わせフォームまたは Instagram DM からお気軽にご連絡ください。",
        "今後は本サイト上でも、最新の活動情報を継続的にお知らせしていきます。"
      ]
    },
    "002": {
      title: "春のモルック体験会を開催しました",
      dateText: "2026年4月15日",
      dateTime: "2026-04-15",
      visualVariant: "soft",
      paragraphs: [
        "春のモルック体験会を芝生広場にて開催しました。初参加の方を中心に、ゆったりとした雰囲気でモルックを楽しんでいただきました。",
        "当日は天候にも恵まれ、ご家族連れやお一人での参加の方など、幅広い層の方にお集まりいただきました。木の棒を投げるシンプルな遊びだからこそ生まれる会話と笑顔が、活動の中心にある時間でした。",
        "次回の体験会は、開催スケジュールに掲載次第お知らせします。"
      ]
    },
    "003": {
      title: "新しい運営メンバーが加わりました",
      dateText: "2026年3月10日",
      dateTime: "2026-03-10",
      visualVariant: "wood",
      paragraphs: [
        "Molkkynistに新しい運営メンバーが加わりました。当日の進行サポートや活動レポートの作成などを担当いただきます。",
        "コミュニティを継続的に運営していくため、関わってくださる方を少しずつ増やしていく方針です。メンバー紹介ページも順次更新します。",
        "運営のお手伝いやコラボレーションのご相談も歓迎しています。お気軽にお問い合わせください。"
      ]
    },
    "004": {
      title: "協力団体ココシバさんと連携を開始",
      dateText: "2026年2月1日",
      dateTime: "2026-02-01",
      visualVariant: "lime",
      paragraphs: [
        "コミュニティスペース「Antenna Books & Cafe ココシバ」さんと協力関係を結びました。今後の体験会や交流イベントの会場として、また活動の情報交換の場として連携していきます。",
        "ココシバさんは、地域の方々が自然に集まれる場づくりを大切にされており、Molkkynistの活動方針とも親和性の高いコミュニティスペースです。",
        "今後のイベント情報や連携企画は、本サイトのお知らせと Instagram で順次ご案内します。"
      ]
    }
  };

  function getId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id && Object.prototype.hasOwnProperty.call(NEWS_ITEMS, id) ? id : null;
  }

  function render(item) {
    const titleEl = document.querySelector("[data-news-title]");
    const dateEl = document.querySelector("[data-news-date]");
    const visualEl = document.querySelector("[data-news-visual]");
    const bodyEl = document.querySelector("[data-news-body]");
    const titleTagEl = document.querySelector("[data-news-page-title]");

    if (titleEl) titleEl.textContent = item.title;
    if (dateEl) {
      dateEl.textContent = item.dateText;
      dateEl.setAttribute("datetime", item.dateTime);
    }
    if (visualEl) {
      visualEl.classList.remove(
        "news-detail__visual--soft",
        "news-detail__visual--wood",
        "news-detail__visual--lime"
      );
      if (item.visualVariant) {
        visualEl.classList.add(`news-detail__visual--${item.visualVariant}`);
      }
    }
    if (bodyEl) {
      bodyEl.innerHTML = "";
      item.paragraphs.forEach((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        bodyEl.appendChild(p);
      });
    }
    if (titleTagEl) {
      titleTagEl.textContent = `${item.title} | お知らせ | Molkkynist`;
    }
  }

  function renderNotFound() {
    const titleEl = document.querySelector("[data-news-title]");
    const dateEl = document.querySelector("[data-news-date]");
    const bodyEl = document.querySelector("[data-news-body]");
    const titleTagEl = document.querySelector("[data-news-page-title]");

    if (titleEl) titleEl.textContent = "お知らせが見つかりませんでした";
    if (dateEl) {
      dateEl.textContent = "";
      dateEl.removeAttribute("datetime");
    }
    if (bodyEl) {
      bodyEl.innerHTML = "";
      const p = document.createElement("p");
      p.textContent = "指定されたお知らせが存在しないか、URLが正しくない可能性があります。お知らせ一覧からもう一度お選びください。";
      bodyEl.appendChild(p);
    }
    if (titleTagEl) {
      titleTagEl.textContent = "お知らせが見つかりません | Molkkynist";
    }
  }

  const id = getId();
  if (id) {
    render(NEWS_ITEMS[id]);
  } else {
    renderNotFound();
  }
})();
