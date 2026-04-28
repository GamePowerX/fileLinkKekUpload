let instanceUrl = document.getElementById("instanceUrl") as HTMLInputElement;
let withFileName = document.getElementById(
  "uploadWithFileName",
) as HTMLInputElement;
let chunkSize = document.getElementById("chunkSize") as HTMLInputElement;
let accountId = new URL(location.href).searchParams.get("accountId");
let button = document.getElementById("save") as HTMLButtonElement;
type AccountSettings = {
  instanceUrl: string;
  withFileName: boolean;
  chunkSize: number;
};

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
    instanceUrl.disabled =
      withFileName.disabled =
      chunkSize.disabled =
      button.disabled =
        true;
    let start = Date.now();
    await browser.storage.local.set({
      [id]: {
        instanceUrl: instanceUrl.value,
        withFileName: withFileName.checked,
        chunkSize: parseInt(chunkSize.value),
      },
    });
    setTimeout(
      () => {
        instanceUrl.disabled =
          withFileName.disabled =
          chunkSize.disabled =
          button.disabled =
            false;
        browser.cloudFile.updateAccount(id, { configured: true });
      },
      Math.max(0, start + 500 - Date.now()),
    );
  };
}
