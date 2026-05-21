// Molkkynist Cloud Functions
//
// 役割:
// - `contactSubmissions` への新規ドキュメント作成をトリガーに、
//   送信者宛の自動返信メール用ドキュメントを `mail` コレクションへ書き込む。
// - 実送信は Firebase Extensions「Trigger Email from Firestore」が `mail` を監視して行う。
//
// 設計メモ:
// - 一般ユーザーには `mail` コレクションを一切公開しない（任意宛先メール送信の悪用防止）。
//   そのため Admin SDK を持つ Cloud Functions 経由でのみ書き込む構成にしている。
// - 自動返信文面は本ファイル内の定数で管理する。
//   文面の運用方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」セクションを参照。

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

initializeApp();

setGlobalOptions({
  region: "asia-northeast1",
  maxInstances: 10,
});

// ---------------------------------------------------------------------------
// 自動返信メール 設定値
// ---------------------------------------------------------------------------
// REPLY_TO_EMAIL は管理者宛の窓口アドレス。
// 自動返信メールへの返信がここに届くようにする。
// 送信元アドレス（From）は Trigger Email Extension の `DEFAULT_FROM` で設定する。
const REPLY_TO_EMAIL = "info@groumapapp.com";
const INSTAGRAM_DM_URL = "https://www.instagram.com/molkkynist/";
const SITE_URL = "https://molkkynist.web.app/";

const INQUIRY_TYPE_LABELS = {
  participate: "参加希望",
  event: "イベントについて",
  media: "メディア取材",
  other: "その他",
};

// ---------------------------------------------------------------------------
// メイントリガー
// ---------------------------------------------------------------------------

exports.sendAutoReplyOnContactCreate = onDocumentCreated(
  "contactSubmissions/{submissionId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("[autoReply] snapshot が空のためスキップ", {
        submissionId: event.params.submissionId,
      });
      return;
    }

    const submission = snap.data() ?? {};
    const email = typeof submission.email === "string" ? submission.email.trim() : "";
    if (!email) {
      logger.warn("[autoReply] email が空のため送信スキップ", {
        submissionId: event.params.submissionId,
      });
      return;
    }

    const name = (submission.name ?? "").trim() || "お問い合わせいただいた方";
    const inquiryType = submission.inquiryType ?? "other";
    const inquiryLabel = INQUIRY_TYPE_LABELS[inquiryType] ?? "お問い合わせ";
    const message = (submission.message ?? "").trim();

    const scheduleLines = await buildScheduleLines(submission);

    const subject = "【Molkkynist】お問い合わせを受け付けました";
    const text = renderTextBody({ name, inquiryLabel, scheduleLines, message });
    const html = renderHtmlBody({ name, inquiryLabel, scheduleLines, message });

    try {
      await getFirestore().collection("mail").add({
        to: email,
        replyTo: REPLY_TO_EMAIL,
        message: { subject, text, html },
        submissionRef: snap.ref.path,
        createdAt: FieldValue.serverTimestamp(),
      });
      logger.info("[autoReply] 自動返信を mail コレクションへ登録", {
        submissionId: event.params.submissionId,
        to: email,
      });
    } catch (err) {
      logger.error("[autoReply] mail コレクションへの書き込みに失敗", err);
      throw err;
    }
  }
);

// ---------------------------------------------------------------------------
// 補助関数
// ---------------------------------------------------------------------------

async function buildScheduleLines(submission) {
  if (submission.inquiryType !== "participate") return [];
  const ids = Array.isArray(submission.selectedEventIds) ? submission.selectedEventIds : [];
  if (ids.length === 0) return [];

  const db = getFirestore();
  const snaps = await Promise.all(
    ids.map((id) =>
      db
        .collection("events")
        .doc(String(id))
        .get()
        .catch((err) => {
          logger.warn("[autoReply] events 取得に失敗", { id, err: err.message });
          return null;
        })
    )
  );

  return snaps
    .filter((doc) => doc && doc.exists)
    .map((doc) => {
      const data = doc.data() ?? {};
      const dateStr = formatEventDate(data.eventDate);
      const parts = [dateStr, data.title, data.locationName].filter(Boolean);
      return parts.join(" / ");
    });
}

function formatEventDate(value) {
  if (!value) return "日程未定";
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "日程未定";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: "Asia/Tokyo",
    }).format(date);
  } catch (_err) {
    return "日程未定";
  }
}

function renderTextBody({ name, inquiryLabel, scheduleLines, message }) {
  const scheduleBlock =
    scheduleLines.length > 0
      ? `\n■ ご希望日程\n${scheduleLines.map((line) => `・${line}`).join("\n")}\n`
      : "";

  const messageBlock = message
    ? `\n■ お問い合わせ内容\n${message}\n`
    : "\n■ お問い合わせ内容\n（本文の記載はありませんでした）\n";

  return `${name} 様

このたびは Molkkynist へお問い合わせいただきありがとうございます。
以下の内容でお問い合わせを受け付けました。
担当者（石井）より、3営業日以内を目安にご返信いたします。

■ お問い合わせ区分
${inquiryLabel}
${scheduleBlock}${messageBlock}
────────────────────────────────────
※このメールは自動送信です。本メールへ直接ご返信いただいても受付できません。
　ご返信が必要な場合は、お手数ですが下記のいずれかからご連絡ください。

・お問い合わせ窓口メール: ${REPLY_TO_EMAIL}
・Instagram DM: ${INSTAGRAM_DM_URL}
────────────────────────────────────

Molkkynist（モルキニスト）
${SITE_URL}
`;
}

function renderHtmlBody({ name, inquiryLabel, scheduleLines, message }) {
  const scheduleBlock =
    scheduleLines.length > 0
      ? `
        <h3 style="margin:24px 0 8px;border-left:4px solid #2f7a4c;padding-left:10px;font-size:15px;">ご希望日程</h3>
        <ul style="padding-left:20px;margin:0;line-height:1.7;">
          ${scheduleLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
        </ul>`
      : "";

  const messageHtml = message
    ? `<pre style="background:#f6f7f5;padding:12px 14px;border-radius:6px;white-space:pre-wrap;font-family:inherit;font-size:14px;margin:0;">${escapeHtml(
        message
      )}</pre>`
    : `<p style="color:#666;margin:0;">（本文の記載はありませんでした）</p>`;

  return `<!DOCTYPE html>
<html lang="ja">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif;line-height:1.8;color:#222;max-width:560px;margin:0 auto;padding:24px;">
    <p>${escapeHtml(name)} 様</p>
    <p>
      このたびは Molkkynist へお問い合わせいただきありがとうございます。<br>
      以下の内容でお問い合わせを受け付けました。<br>
      担当者（石井）より、3営業日以内を目安にご返信いたします。
    </p>
    <h3 style="margin:24px 0 8px;border-left:4px solid #2f7a4c;padding-left:10px;font-size:15px;">お問い合わせ区分</h3>
    <p style="margin:0;">${escapeHtml(inquiryLabel)}</p>
    ${scheduleBlock}
    <h3 style="margin:24px 0 8px;border-left:4px solid #2f7a4c;padding-left:10px;font-size:15px;">お問い合わせ内容</h3>
    ${messageHtml}
    <hr style="border:none;border-top:1px solid #e2e2e2;margin:32px 0 16px;">
    <p style="font-size:12.5px;color:#666;line-height:1.7;">
      ※このメールは自動送信です。本メールへ直接ご返信いただいても受付できません。<br>
      ご返信が必要な場合は、お手数ですが下記のいずれかからご連絡ください。
    </p>
    <ul style="font-size:12.5px;color:#666;padding-left:20px;line-height:1.7;">
      <li>お問い合わせ窓口メール: <a href="mailto:${escapeHtml(REPLY_TO_EMAIL)}">${escapeHtml(REPLY_TO_EMAIL)}</a></li>
      <li>Instagram DM: <a href="${escapeHtml(INSTAGRAM_DM_URL)}">${escapeHtml(INSTAGRAM_DM_URL)}</a></li>
    </ul>
    <p style="font-size:12.5px;color:#666;margin-top:24px;">
      Molkkynist（モルキニスト）<br>
      <a href="${escapeHtml(SITE_URL)}">${escapeHtml(SITE_URL)}</a>
    </p>
  </body>
</html>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
