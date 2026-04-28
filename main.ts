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

let activeUploads = new Map<string, UploadState>();

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
  if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) {
    throw new Error("Upload chunk size must be a positive whole number.");
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
        await uploader.destroy().catch(() => undefined);
        return { aborted: true };
      }

      await uploader.upload_file(file, () => undefined);
      if (state.aborted) {
        await uploader.destroy().catch(() => undefined);
        return { aborted: true };
      }

      let url = await uploader.finish();
      if (state.aborted) {
        return { aborted: true };
      }

      return { url: new URL(url.id, baseUrl).href };
    } catch (error) {
      if (activeUploads.get(uploadKey)?.aborted || error === "CANCELLED") {
        return { aborted: true };
      }

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
  state.uploader
    .cancel()
    .catch(() => state.uploader.destroy().catch(() => undefined));
});
