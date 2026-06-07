// 管理画面共通のFirebase Storage画像アップロード補助。
// 画像URLの手入力ではなく、管理者が選択したファイルをStorageへ保存する。

import { STORAGE_MODULE_URL } from "./admin-auth.js";

export const ADMIN_IMAGE_MAX_SIZE = 5 * 1024 * 1024;
export const ADMIN_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function setupAdminImageUpload({
  fileInput,
  preview,
  previewImg,
  clearButton,
  statusEl,
  showStatus,
  clearStatus,
}) {
  if (!fileInput) {
    return {
      getSelectedFile: () => null,
      clear: () => {},
    };
  }

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0] ?? null;
    clearStatus?.(statusEl);

    if (!file) {
      clearImageSelection({ fileInput, preview, previewImg, clearButton });
      return;
    }

    const validationError = validateAdminImageFile(file);
    if (validationError) {
      fileInput.value = "";
      clearImageSelection({ fileInput, preview, previewImg, clearButton });
      showStatus?.(statusEl, validationError, "error");
      return;
    }

    if (preview && previewImg) {
      revokePreviewUrl(previewImg);
      previewImg.src = URL.createObjectURL(file);
      preview.hidden = false;
      if (clearButton) clearButton.hidden = false;
    }
  });

  clearButton?.addEventListener("click", () => {
    clearImageSelection({ fileInput, preview, previewImg, clearButton });
    clearStatus?.(statusEl);
  });

  return {
    getSelectedFile: () => {
      const file = fileInput.files?.[0] ?? null;
      if (!file) return null;

      const validationError = validateAdminImageFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      return file;
    },
    clear: () => clearImageSelection({ fileInput, preview, previewImg, clearButton }),
  };
}

export async function uploadAdminImage(app, { collectionName, documentId, file, prefix = "image" }) {
  const storage = await import(STORAGE_MODULE_URL);
  const { getStorage, ref, uploadBytes, getDownloadURL } = storage;
  const storageRef = ref(
    getStorage(app),
    buildAdminImagePath({ collectionName, documentId, file, prefix }),
  );
  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      source: `admin-${collectionName}`,
    },
  });
  return getDownloadURL(snapshot.ref);
}

export async function deleteAdminImageByUrl(app, imageUrl) {
  if (!imageUrl || !isFirebaseStorageUrl(imageUrl)) return;

  try {
    const storage = await import(STORAGE_MODULE_URL);
    const { getStorage, ref, deleteObject } = storage;
    await deleteObject(ref(getStorage(app), imageUrl));
  } catch (error) {
    console.warn("[admin-storage] Storage画像の削除に失敗しました", error);
  }
}

export function validateAdminImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "アップロードできる画像は JPEG / PNG / WebP のみです。";
  }
  if (file.size > ADMIN_IMAGE_MAX_SIZE) {
    return "画像サイズは5MB以下にしてください。";
  }
  return "";
}

function clearImageSelection({ fileInput, preview, previewImg, clearButton }) {
  if (fileInput) fileInput.value = "";
  if (previewImg) {
    revokePreviewUrl(previewImg);
    previewImg.src = "";
  }
  if (preview) preview.hidden = true;
  if (clearButton) clearButton.hidden = true;
}

function revokePreviewUrl(image) {
  if (image.src.startsWith("blob:")) {
    URL.revokeObjectURL(image.src);
  }
}

function buildAdminImagePath({ collectionName, documentId, file, prefix }) {
  const extension = imageExtension(file.type);
  return `${collectionName}/${documentId}/${prefix}-${Date.now()}.${extension}`;
}

function imageExtension(contentType) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

function isFirebaseStorageUrl(value) {
  return /^https:\/\/firebasestorage\.googleapis\.com\//.test(value) || /^gs:\/\//.test(value);
}
