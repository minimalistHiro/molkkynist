// Molkkynist Cloud Functions
//
// 役割:
// - `contactSubmissions` への新規ドキュメント作成をトリガーに、
//   送信者宛の自動返信メールを SMTP 経由で送信する。
// - 運営者宛に新規お問い合わせ通知メールを SMTP 経由で送信する。
// - 送信状態は `mail` コレクションに記録し、管理画面から Cloud Functions 経由で確認する。
//
// 設計メモ:
// - 一般ユーザーには `mail` コレクションを一切公開しない（任意宛先メール送信の悪用防止）。
//   そのため Admin SDK を持つ Cloud Functions 経由でのみ書き込む構成にしている。
// - 自動返信文面は本ファイル内の定数で管理する。
//   文面の運用方針は `CONTENT_GUIDELINES.md`「自動返信メール文面」セクションを参照。

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

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
// ADMIN_NOTIFICATION_EMAIL は新規お問い合わせ通知の送信先。
// 送信元アドレス（From）は Functions Secret `SMTP_FROM` で設定する。
const SMTP_HOST = defineSecret("SMTP_HOST");
const SMTP_PORT = defineSecret("SMTP_PORT");
const SMTP_USER = defineSecret("SMTP_USER");
const SMTP_PASS = defineSecret("SMTP_PASS");
const SMTP_FROM = defineSecret("SMTP_FROM");
const SMTP_SECURE = defineSecret("SMTP_SECURE");

const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || "molkkynist@gmail.com";
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || REPLY_TO_EMAIL;
const INSTAGRAM_DM_URL = "https://www.instagram.com/molkkynist?igsh=MXYyZGVycGxtajh3aA==";
const SITE_URL = "https://molkkynist-a0abd.web.app/";
const ADMIN_CONTACT_URL = `${SITE_URL}admin/contact-submissions.html`;
const ADMIN_PARTICIPANTS_URL = `${SITE_URL}admin/event-participants.html`;
const DEFAULT_ADMIN_UIDS = [
  "PvM8qIBG1ETC2Y7qM3PFj1i2ASk2",
  "hvb1k4YC0ma98YsdlKU8DCEcqa63",
];
const ADMIN_UIDS = parseAdminUids(process.env.ADMIN_UIDS, process.env.ADMIN_UID, DEFAULT_ADMIN_UIDS);

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
  {
    document: "contactSubmissions/{submissionId}",
    secrets: [SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE],
  },
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
    const phone = (submission.phone ?? "").trim();
    const message = (submission.message ?? "").trim();
    const isParticipation = inquiryType === "participate";
    const eventDetails = await buildSelectedEventDetails(submission);
    const db = getFirestore();

    try {
      const smtpConfig = getSmtpConfig();
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth,
      });
      const submissionRef = snap.ref.path;
      const autoReplyMessage = buildAutoReplyMessage({
        name,
        inquiryLabel,
        message,
        isParticipation,
        eventDetails,
      });
      const adminNotificationMessage = buildAdminNotificationMessage({
        name,
        email,
        phone,
        inquiryLabel,
        message,
        isParticipation,
        eventDetails,
        createdAt: submission.createdAt,
      });

      await sendTrackedMail({
        db,
        transporter,
        smtpConfig,
        type: "autoReply",
        logLabel: "autoReply",
        submissionId: event.params.submissionId,
        submissionRef,
        to: email,
        replyTo: REPLY_TO_EMAIL,
        ...autoReplyMessage,
      });

      await sendTrackedMail({
        db,
        transporter,
        smtpConfig,
        type: "adminNotification",
        logLabel: "adminNotification",
        submissionId: event.params.submissionId,
        submissionRef,
        to: ADMIN_NOTIFICATION_EMAIL,
        replyTo: email,
        ...adminNotificationMessage,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("[contactMail] メール送信処理の初期化に失敗", {
        submissionId: event.params.submissionId,
        error: errorMessage,
      });
    }
  }
);

exports.getMailDeliveryStates = onCall(async (request) => {
  assertAdmin(request);

  const submissionIds = Array.isArray(request.data?.submissionIds)
    ? request.data.submissionIds.map((id) => String(id)).filter(Boolean).slice(0, 50)
    : [];

  if (submissionIds.length === 0) {
    return { states: {} };
  }

  const db = getFirestore();
  const entries = await Promise.all(
    submissionIds.map(async (submissionId) => {
      const submissionRef = `contactSubmissions/${submissionId}`;
      const snapshot = await db
        .collection("mail")
        .where("submissionRef", "==", submissionRef)
        .get();

      if (snapshot.empty) {
        return [
          submissionId,
          {
            state: "NOT_CREATED",
            error: "",
            updatedAt: null,
          },
        ];
      }

      const mail = snapshot.docs[0].data() ?? {};
      const autoReplyMail =
        snapshot.docs
          .map((doc) => doc.data() ?? {})
          .find((item) => item.type === "autoReply" || !item.type) ?? mail;
      const delivery = autoReplyMail.delivery ?? {};
      return [
        submissionId,
        {
          state: delivery.state || "PROCESSING",
          error: delivery.error || delivery.errorMessage || "",
          updatedAt: formatCallableDate(
            delivery.endTime || delivery.updateTime || autoReplyMail.createdAt
          ),
        },
      ];
    })
  );

  return { states: Object.fromEntries(entries) };
});

// ---------------------------------------------------------------------------
// 補助関数
// ---------------------------------------------------------------------------

function buildAutoReplyMessage({ name, inquiryLabel, message, isParticipation, eventDetails }) {
  const subject = isParticipation
    ? "【Molkkynist】参加希望を受け付けました"
    : "【Molkkynist】お問い合わせを受け付けました";
  const text = isParticipation
    ? renderParticipationTextBody({ name, eventDetails, message })
    : renderTextBody({ name, inquiryLabel, scheduleLines: [], message });
  const html = isParticipation
    ? renderParticipationHtmlBody({ name, eventDetails, message })
    : renderHtmlBody({ name, inquiryLabel, scheduleLines: [], message });

  return { subject, text, html };
}

function buildAdminNotificationMessage({
  name,
  email,
  phone,
  inquiryLabel,
  message,
  isParticipation,
  eventDetails,
  createdAt,
}) {
  const subject = isParticipation
    ? "【Molkkynist】新しい参加希望が届きました"
    : "【Molkkynist】新しいお問い合わせが届きました";
  const text = renderAdminNotificationTextBody({
    name,
    email,
    phone,
    inquiryLabel,
    message,
    isParticipation,
    eventDetails,
    createdAt,
  });
  const html = renderAdminNotificationHtmlBody({
    name,
    email,
    phone,
    inquiryLabel,
    message,
    isParticipation,
    eventDetails,
    createdAt,
  });

  return { subject, text, html };
}

async function sendTrackedMail({
  db,
  transporter,
  smtpConfig,
  type,
  logLabel,
  submissionId,
  submissionRef,
  to,
  replyTo,
  subject,
  text,
  html,
}) {
  const mailRef = db.collection("mail").doc();

  try {
    await safeMailSet(mailRef, {
      type,
      to,
      replyTo,
      message: { subject, text, html },
      submissionRef,
      createdAt: FieldValue.serverTimestamp(),
      delivery: {
        state: "PROCESSING",
        startTime: FieldValue.serverTimestamp(),
        error: "",
      },
    });

    const result = await transporter.sendMail({
      from: smtpConfig.from,
      to,
      replyTo,
      subject,
      text,
      html,
    });

    await safeMailUpdate(mailRef, {
      "delivery.state": "SUCCESS",
      "delivery.endTime": FieldValue.serverTimestamp(),
      "delivery.messageId": result.messageId || "",
      "delivery.error": "",
    });

    logger.info(`[${logLabel}] メールを送信`, {
      submissionId,
      to,
      type,
      messageId: result.messageId,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[${logLabel}] メール送信に失敗`, {
      submissionId,
      to,
      type,
      error: errorMessage,
    });
    await safeMailSet(
      mailRef,
      {
        type,
        to,
        replyTo,
        message: { subject, text, html },
        submissionRef,
        createdAt: FieldValue.serverTimestamp(),
        delivery: {
          state: "ERROR",
          endTime: FieldValue.serverTimestamp(),
          error: errorMessage,
        },
      },
      { merge: true }
    );
  }
}

async function buildSelectedEventDetails(submission) {
  if (submission.inquiryType !== "participate") return [];
  const ids = Array.isArray(submission.selectedEventIds) ? submission.selectedEventIds : [];
  if (ids.length === 0) return [];

  const db = getFirestore();
  const eventSnaps = await Promise.all(
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

  return Promise.all(
    eventSnaps.filter((doc) => doc && doc.exists).map(async (doc) => {
      const data = doc.data() ?? {};
      const venueId = stringValue(data.venueId);
      const venueData = venueId ? await fetchVenueData(db, venueId) : null;
      return normalizeAutoReplyEvent(doc.id, data, venueData);
    })
  );
}

async function fetchVenueData(db, venueId) {
  try {
    const snap = await db.collection("venues").doc(venueId).get();
    return snap.exists ? snap.data() ?? {} : null;
  } catch (err) {
    logger.warn("[autoReply] venues 取得に失敗", {
      venueId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function normalizeAutoReplyEvent(id, eventData, venueData) {
  return {
    id,
    date: formatEventDate(eventData.eventDate),
    time: formatTimeRange(eventData.startTime, eventData.endTime),
    meetingTime: firstString(
      eventData.meetingTime,
      eventData.gatheringTime,
      eventData.assemblyTime
    ),
    venueName: firstString(venueData?.name, eventData.locationName) || "開催場所未定",
    venueAddress: firstString(venueData?.address, eventData.locationAddress),
    mapUrl: firstString(venueData?.mapUrl, eventData.mapUrl),
    accessNote: firstString(venueData?.accessNote, eventData.accessNote),
    venueNote: firstString(venueData?.note, eventData.locationNote),
    fee: stringValue(eventData.fee),
    rainPolicy: stringValue(eventData.rainPolicy),
  };
}

async function safeMailSet(mailRef, data, options) {
  try {
    if (options) {
      await mailRef.set(data, options);
    } else {
      await mailRef.set(data);
    }
  } catch (err) {
    logger.warn("[autoReply] mail コレクションへの記録に失敗", {
      path: mailRef.path,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function safeMailUpdate(mailRef, data) {
  try {
    await mailRef.update(data);
  } catch (err) {
    logger.warn("[autoReply] mail コレクションの更新に失敗", {
      path: mailRef.path,
      error: err instanceof Error ? err.message : String(err),
    });
  }
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

function formatTimeRange(startTime, endTime) {
  const start = stringValue(startTime);
  const end = stringValue(endTime);
  if (start && end) return `${start}〜${end}`;
  return start || end || "";
}

function firstString(...values) {
  return values.map((value) => stringValue(value)).find(Boolean) || "";
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function assertAdmin(request) {
  if (ADMIN_UIDS.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "管理者UIDが未設定です。Cloud Functions の環境変数 ADMIN_UIDS へ管理者UID一覧を設定してください。"
    );
  }
  if (!request.auth || !ADMIN_UIDS.includes(request.auth.uid)) {
    throw new HttpsError("permission-denied", "管理者のみ利用できます。");
  }
}

function parseAdminUids(...sources) {
  const values = sources.flatMap((source) => {
    if (Array.isArray(source)) return source;
    if (typeof source !== "string") return [];
    return source.split(",");
  });

  return Array.from(
    new Set(
      values
        .map((uid) => String(uid).trim())
        .filter((uid) => uid && !uid.startsWith("YOUR_"))
    )
  );
}

function formatCallableDate(value) {
  if (!value) return null;
  try {
    const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch (_err) {
    return null;
  }
}

function getSmtpConfig() {
  const host = SMTP_HOST.value();
  const port = Number(SMTP_PORT.value() || "587");
  const user = SMTP_USER.value();
  const pass = SMTP_PASS.value();
  const from = SMTP_FROM.value();
  const secure = (SMTP_SECURE.value() || "false").toLowerCase() === "true";

  if (!host || !user || !pass || !from) {
    throw new Error("SMTP Secret の設定が未完了です");
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
  };
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
※このメールは自動送信です。このメールへ返信すると、お問い合わせ窓口メールに届きます。
　お急ぎの場合は Instagram DM からもご連絡いただけます。

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
        <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">ご希望日程</h3>
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
    <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">お問い合わせ区分</h3>
    <p style="margin:0;">${escapeHtml(inquiryLabel)}</p>
    ${scheduleBlock}
    <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">お問い合わせ内容</h3>
    ${messageHtml}
    <hr style="border:none;border-top:1px solid #e2e2e2;margin:32px 0 16px;">
    <p style="font-size:12.5px;color:#666;line-height:1.7;">
      ※このメールは自動送信です。このメールへ返信すると、お問い合わせ窓口メールに届きます。<br>
      お急ぎの場合は Instagram DM からもご連絡いただけます。
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

function renderParticipationTextBody({ name, eventDetails, message }) {
  const eventBlock =
    eventDetails.length > 0
      ? eventDetails
          .map((eventItem, index) =>
            formatParticipationEventText(eventItem, index, eventDetails.length)
          )
          .join("\n\n")
      : "（選択されたイベント情報を確認中です。フォームで選択いただいた内容は受け付けています。）";

  const messageBlock = message
    ? `\n■ 送信いただいた内容\n${message}\n`
    : "\n■ 送信いただいた内容\n（本文の記載はありませんでした）\n";

  return `${name} 様

このたびは Molkkynist のイベントへお申し込みいただきありがとうございます。
以下の内容で参加希望を受け付けました。

このメールをもって受付完了となります。
通常、主催者からの個別返信は行っておりませんので、当日は以下の内容をご確認のうえ、集合場所までお越しください。

■ 参加予定イベント
${eventBlock}
${messageBlock}
内容の変更やキャンセルがある場合は、このメールへの返信、または公式InstagramのDMからご連絡ください。

────────────────────────────────────
※このメールは自動送信です。このメールへ返信すると、お問い合わせ窓口メールに届きます。

・お問い合わせ窓口メール: ${REPLY_TO_EMAIL}
・Instagram DM: ${INSTAGRAM_DM_URL}
────────────────────────────────────

Molkkynist（モルキニスト）
${SITE_URL}
`;
}

function renderParticipationHtmlBody({ name, eventDetails, message }) {
  const eventsHtml =
    eventDetails.length > 0
      ? eventDetails
          .map((eventItem, index) =>
            formatParticipationEventHtml(eventItem, index, eventDetails.length)
          )
          .join("")
      : `<p style="margin:0;color:#666;">（選択されたイベント情報を確認中です。フォームで選択いただいた内容は受け付けています。）</p>`;

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
      このたびは Molkkynist のイベントへお申し込みいただきありがとうございます。<br>
      以下の内容で参加希望を受け付けました。
    </p>
    <p>
      このメールをもって受付完了となります。<br>
      通常、主催者からの個別返信は行っておりませんので、当日は以下の内容をご確認のうえ、集合場所までお越しください。
    </p>
    <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">参加予定イベント</h3>
    ${eventsHtml}
    <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">送信いただいた内容</h3>
    ${messageHtml}
    <p style="margin:24px 0 0;">
      内容の変更やキャンセルがある場合は、このメールへの返信、または公式InstagramのDMからご連絡ください。
    </p>
    <hr style="border:none;border-top:1px solid #e2e2e2;margin:32px 0 16px;">
    <p style="font-size:12.5px;color:#666;line-height:1.7;">
      ※このメールは自動送信です。このメールへ返信すると、お問い合わせ窓口メールに届きます。
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

function renderAdminNotificationTextBody({
  name,
  email,
  phone,
  inquiryLabel,
  message,
  isParticipation,
  eventDetails,
  createdAt,
}) {
  const eventBlock = isParticipation
    ? `\n■ 参加希望日程\n${renderAdminEventTextBlock(eventDetails)}\n`
    : "";
  const messageBlock = message
    ? `\n■ お問い合わせ内容\n${message}\n`
    : "\n■ お問い合わせ内容\n（本文の記載はありませんでした）\n";
  const adminUrl = isParticipation ? ADMIN_PARTICIPANTS_URL : ADMIN_CONTACT_URL;
  const submitDate = formatSubmissionDate(createdAt);

  return `新しい${isParticipation ? "参加希望" : "お問い合わせ"}が届きました。

■ お名前
${name}

■ メールアドレス
${email}

■ 電話番号
${phone || "未入力"}

■ お問い合わせ区分
${inquiryLabel}
${eventBlock}${messageBlock}
■ 送信日時
${submitDate}

■ 管理画面
${adminUrl}

この通知メールに返信すると、フォーム入力者のメールアドレス宛に返信できます。
`;
}

function renderAdminNotificationHtmlBody({
  name,
  email,
  phone,
  inquiryLabel,
  message,
  isParticipation,
  eventDetails,
  createdAt,
}) {
  const adminUrl = isParticipation ? ADMIN_PARTICIPANTS_URL : ADMIN_CONTACT_URL;
  const messageHtml = message
    ? `<pre style="background:#f6f7f5;padding:12px 14px;border-radius:6px;white-space:pre-wrap;font-family:inherit;font-size:14px;margin:0;">${escapeHtml(
        message
      )}</pre>`
    : `<p style="color:#666;margin:0;">（本文の記載はありませんでした）</p>`;
  const eventHtml = isParticipation
    ? `
    <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">参加希望日程</h3>
    ${renderAdminEventHtmlBlock(eventDetails)}`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif;line-height:1.8;color:#222;max-width:640px;margin:0 auto;padding:24px;">
    <p>新しい${isParticipation ? "参加希望" : "お問い合わせ"}が届きました。</p>
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:18px 0;">
      <tbody>
        ${renderAdminInfoRow("お名前", name)}
        ${renderAdminInfoRow("メールアドレス", email)}
        ${renderAdminInfoRow("電話番号", phone || "未入力")}
        ${renderAdminInfoRow("お問い合わせ区分", inquiryLabel)}
        ${renderAdminInfoRow("送信日時", formatSubmissionDate(createdAt))}
      </tbody>
    </table>
    ${eventHtml}
    <h3 style="margin:24px 0 8px;border-left:4px solid #3f9d52;padding-left:10px;font-size:15px;">お問い合わせ内容</h3>
    ${messageHtml}
    <p style="margin:24px 0 0;">
      管理画面: <a href="${escapeHtml(adminUrl)}">${escapeHtml(adminUrl)}</a>
    </p>
    <p style="font-size:12.5px;color:#666;margin-top:24px;">
      この通知メールに返信すると、フォーム入力者のメールアドレス宛に返信できます。
    </p>
  </body>
</html>`;
}

function renderAdminEventTextBlock(eventDetails) {
  if (eventDetails.length === 0) {
    return "（選択されたイベント情報を確認中です。管理画面で送信内容を確認してください。）";
  }

  return eventDetails
    .map((eventItem, index) => formatParticipationEventText(eventItem, index, eventDetails.length))
    .join("\n\n");
}

function renderAdminEventHtmlBlock(eventDetails) {
  if (eventDetails.length === 0) {
    return `<p style="margin:0;color:#666;">（選択されたイベント情報を確認中です。管理画面で送信内容を確認してください。）</p>`;
  }

  return eventDetails
    .map((eventItem, index) => formatParticipationEventHtml(eventItem, index, eventDetails.length))
    .join("");
}

function renderAdminInfoRow(label, value) {
  return `
        <tr>
          <th style="width:34%;text-align:left;vertical-align:top;padding:8px 10px;background:#f6f7f5;border-bottom:1px solid #e7e9e4;font-size:13px;">${escapeHtml(
            label
          )}</th>
          <td style="padding:8px 10px;border-bottom:1px solid #e7e9e4;font-size:13px;">${escapeHtml(
            value
          )}</td>
        </tr>`;
}

function formatSubmissionDate(value) {
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "日時未取得";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    }).format(date);
  } catch (_err) {
    return "日時未取得";
  }
}

function formatParticipationEventText(eventItem, index, total) {
  const lines = [];
  if (total > 1) lines.push(`【${index + 1}】`);
  lines.push(`開催日: ${eventItem.date}`);
  if (eventItem.time) lines.push(`開催時間: ${eventItem.time}`);
  if (eventItem.meetingTime) lines.push(`集合時刻: ${eventItem.meetingTime}`);
  lines.push(`会場: ${eventItem.venueName}`);
  if (eventItem.venueAddress) lines.push(`住所: ${eventItem.venueAddress}`);
  if (eventItem.accessNote) lines.push(`集合場所・アクセス補足: ${eventItem.accessNote}`);
  if (eventItem.mapUrl) lines.push(`Googleマップ: ${eventItem.mapUrl}`);
  if (eventItem.fee) lines.push(`参加費: ${eventItem.fee}`);
  if (eventItem.rainPolicy) lines.push(`雨天時の対応: ${eventItem.rainPolicy}`);
  if (eventItem.venueNote) lines.push(`備考: ${eventItem.venueNote}`);
  return lines.join("\n");
}

function formatParticipationEventHtml(eventItem, index, total) {
  const rows = [
    ["開催日", escapeHtml(eventItem.date)],
    ["開催時間", escapeHtml(eventItem.time)],
    ["集合時刻", escapeHtml(eventItem.meetingTime)],
    ["会場", escapeHtml(eventItem.venueName)],
    ["住所", escapeHtml(eventItem.venueAddress)],
    ["集合場所・アクセス補足", escapeHtml(eventItem.accessNote)],
    [
      "Googleマップ",
      eventItem.mapUrl
        ? `<a href="${escapeHtml(eventItem.mapUrl)}">${escapeHtml(eventItem.mapUrl)}</a>`
        : "",
    ],
    ["参加費", escapeHtml(eventItem.fee)],
    ["雨天時の対応", escapeHtml(eventItem.rainPolicy)],
    ["備考", escapeHtml(eventItem.venueNote)],
  ].filter(([, value]) => value);

  const title = total > 1 ? `<p style="font-weight:700;margin:16px 0 8px;">${index + 1}件目</p>` : "";
  const rowHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <th style="width:34%;text-align:left;vertical-align:top;padding:6px 10px;background:#f6f7f5;border-bottom:1px solid #e7e9e4;font-size:13px;">${escapeHtml(
            label
          )}</th>
          <td style="padding:6px 10px;border-bottom:1px solid #e7e9e4;font-size:13px;">${value}</td>
        </tr>`
    )
    .join("");

  return `${title}
    <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 14px;">
      <tbody>${rowHtml}</tbody>
    </table>`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
