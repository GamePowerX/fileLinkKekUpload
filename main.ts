import { FileUploader, KekUploadAPI } from "kekupload-lib-ts";

type AccountSettings = {
  instanceUrl: string;
  withFileName: boolean;
  chunkSize: number;
};

type UploadState = {
  uploader: FileUploader;
  aborted: boolean;
};

const MAX_CHUNK_SIZE = 32 * 1024 * 1024;

let activeUploads = new Map<string, UploadState>();
let debugLogging = false;

if (browser.management?.getSelf) {
  browser.management
    .getSelf()
    .then((info) => {
      debugLogging = info.installType === "development";
    })
    .catch(() => undefined);
}

function debugLog(...args: unknown[]) {
  if (debugLogging) {
    console.log("[FileLinkKekUpload]", ...args);
  }
}

async function getSettings(accountId: string) {
  let settings = await browser.storage.local.get([accountId]);
  return settings[accountId] as AccountSettings | undefined;
}

function getBaseUrl(instanceUrl: string) {
  let url: URL;
  try {
    url = new URL(instanceUrl.trim());
  } catch {
    throw new Error("Enter a valid KekUpload instance URL.");
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLocalhost(url.hostname))
  ) {
    throw new Error(
      "KekUpload instance URL must use HTTPS, except for localhost.",
    );
  }
  if (url.username || url.password) {
    throw new Error(
      "KekUpload instance URL must not include a username or password.",
    );
  }
  if (url.search || url.hash) {
    throw new Error(
      "KekUpload instance URL must not include a query string or fragment.",
    );
  }

  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

function isLocalhost(hostname: string) {
  let normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1";
}

function getUploadKey(accountId: string, fileId: number) {
  return `${accountId}:${fileId}`;
}

function getFileParts(fileName: string) {
  let lastDot = fileName.lastIndexOf(".");
  if (lastDot > 0 && lastDot < fileName.length - 1) {
    return {
      name: fileName.slice(0, lastDot),
      ext: fileName.slice(lastDot + 1),
    };
  }

  return { name: fileName, ext: "" };
}

function getUploadFile(fileInfo: browser.cloudFile.CloudFile) {
  if (fileInfo.data instanceof File) {
    return fileInfo.data;
  }

  return new File([fileInfo.data], fileInfo.name || "attachment", {
    type: "application/octet-stream",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error) {
    let maybeMessage = error as { error?: unknown; message?: unknown };
    if (typeof maybeMessage.error === "string") {
      return maybeMessage.error;
    }
    if (typeof maybeMessage.message === "string") {
      return maybeMessage.message;
    }
  }

  return "Upload failed.";
}

function validateChunkSize(chunkSize: number) {
  if (
    !Number.isSafeInteger(chunkSize) ||
    chunkSize < 1 ||
    chunkSize > MAX_CHUNK_SIZE
  ) {
    throw new Error(
      `Upload chunk size must be a positive whole number no larger than ${MAX_CHUNK_SIZE} bytes.`,
    );
  }
}

browser.cloudFile.onFileUpload.addListener(
  async (
    account: browser.cloudFile.CloudFileAccount,
    fileInfo: browser.cloudFile.CloudFile,
  ) => {
    let uploadKey = getUploadKey(account.id, fileInfo.id);
    try {
      let settings = await getSettings(account.id);
      if (!settings) {
        return { error: "FileLinkKekUpload account is not configured." };
      }

      let baseUrl = getBaseUrl(settings.instanceUrl);
      validateChunkSize(settings.chunkSize);

      let uploader = new FileUploader({
        read_size: 1024 * 1024 * 32,
        chunk_size: settings.chunkSize,
        api: new KekUploadAPI(baseUrl),
      });
      let state: UploadState = { uploader, aborted: false };
      activeUploads.set(uploadKey, state);

      let file = getUploadFile(fileInfo);
      let { name, ext } = getFileParts(
        file.name || fileInfo.name || "attachment",
      );
      let uploadName = settings.withFileName ? name : undefined;

      await uploader.begin(ext, uploadName);
      if (state.aborted) {
        debugLog("Upload aborted before file data was sent", fileInfo.id);
        await uploader.destroy().catch(() => undefined);
        return { aborted: true };
      }

      await uploader.upload_file(file, () => undefined);
      if (state.aborted) {
        debugLog("Upload aborted after file data was sent", fileInfo.id);
        await uploader.destroy().catch(() => undefined);
        return { aborted: true };
      }

      let url = await uploader.finish();
      if (state.aborted) {
        debugLog("Upload aborted after finish request", fileInfo.id);
        return { aborted: true };
      }

      return { url: new URL(url.id, baseUrl).href };
    } catch (error) {
      if (activeUploads.get(uploadKey)?.aborted || error === "CANCELLED") {
        debugLog("Upload cancelled", fileInfo.id);
        return { aborted: true };
      }

      debugLog("Upload failed", error);
      return { error: getErrorMessage(error) };
    } finally {
      activeUploads.delete(uploadKey);
    }
  },
);

browser.cloudFile.onFileUploadAbort.addListener((account, fileId) => {
  let state = activeUploads.get(getUploadKey(account.id, fileId));
  if (!state) {
    return;
  }

  state.aborted = true;
  debugLog("Abort requested", fileId);
  state.uploader
    .cancel()
    .catch(() => state.uploader.destroy().catch(() => undefined));
});
