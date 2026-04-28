let instanceUrl = document.getElementById("instanceUrl") as HTMLInputElement;
let withFileName = document.getElementById(
  "uploadWithFileName",
) as HTMLInputElement;
let chunkSize = document.getElementById("chunkSize") as HTMLInputElement;
let accountId = new URL(location.href).searchParams.get("accountId");
let button = document.getElementById("save") as HTMLButtonElement;
let statusMessage = document.getElementById("status") as HTMLParagraphElement;
type AccountSettings = {
  instanceUrl: string;
  withFileName: boolean;
  chunkSize: number;
};

function isLocalhost(hostname: string) {
  let normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1";
}

function normalizeInstanceUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid KekUpload instance URL.");
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && isLocalhost(url.hostname))
  ) {
    throw new Error(
      "Use HTTPS for the KekUpload instance URL, except for localhost.",
    );
  }
  if (url.username || url.password) {
    throw new Error(
      "The instance URL must not include a username or password.",
    );
  }
  if (url.search || url.hash) {
    throw new Error(
      "The instance URL must not include a query string or fragment.",
    );
  }

  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

function getValidatedChunkSize() {
  let parsed = Number(chunkSize.value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("Chunk size must be a positive whole number.");
  }

  return parsed;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Settings could not be saved.";
}

function setDisabled(disabled: boolean) {
  instanceUrl.disabled =
    withFileName.disabled =
    chunkSize.disabled =
    button.disabled =
      disabled;
}

function showStatus(message: string, isError = false) {
  statusMessage.textContent = message;
  statusMessage.hidden = !message;
  statusMessage.classList.toggle("error", isError);
}

if (typeof accountId === "string" && accountId) {
  let id = accountId as string;
  browser.storage.local.get([id]).then((accountInfo) => {
    let settings = accountInfo[id] as AccountSettings | undefined;
    if (!settings) {
      return;
    }
    instanceUrl.value = settings.instanceUrl;
    withFileName.checked = settings.withFileName;
    chunkSize.value = settings.chunkSize.toString();
  });

  button.onclick = async () => {
    showStatus("");
    let normalizedUrl: string;
    let parsedChunkSize: number;
    try {
      normalizedUrl = normalizeInstanceUrl(instanceUrl.value);
      parsedChunkSize = getValidatedChunkSize();
    } catch (error) {
      showStatus(getErrorMessage(error), true);
      return;
    }

    setDisabled(true);
    let start = Date.now();
    try {
      await browser.storage.local.set({
        [id]: {
          instanceUrl: normalizedUrl,
          withFileName: withFileName.checked,
          chunkSize: parsedChunkSize,
        },
      });
      await browser.cloudFile.updateAccount(id, { configured: true });
      instanceUrl.value = normalizedUrl;
      showStatus("Settings saved.");
    } catch (error) {
      showStatus(getErrorMessage(error), true);
    }

    setTimeout(
      () => {
        setDisabled(false);
      },
      Math.max(0, start + 500 - Date.now()),
    );
  };
}
