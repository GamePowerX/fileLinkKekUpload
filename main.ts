import { FileUploader } from "kekupload-lib-ts";
import { FileUploaderOptions } from "kekupload-lib-ts";

async function getSettings(accountId: string) {
  let settings = await browser.storage.local.get([accountId]);
  return settings[accountId];
}

browser.cloudFile.onFileUpload.addListener(
  async (
    account: browser.cloudFile.CloudFileAccount,
    fileInfo: browser.cloudFile.CloudFile,
  ) => {
    console.log("onFileUpload");
    let settings = await getSettings(account.id);
    let uploader = new FileUploader({
      read_size: 1024 * 1024 * 32,
      chunk_size: settings.chunkSize,
      api: settings.instanceUrl,
    });
    let fileName = "";
    let name = "";
    let ext = "";
    if (fileInfo.data instanceof File) {
      fileName = fileInfo.data.name;
      console.log("File");
      ext = fileName.split(".").pop() as string;
      console.log("Extension:" + ext);
      name = fileName.replace("." + ext, "");
      console.log("Name:" + name);
    } else {
      console.log("Blob");
      name = fileInfo.name;
    }
    console.log("uploading " + name + " to " + settings.instanceUrl);
    try {
      await uploader.begin(ext, name);
      if (fileInfo.data instanceof File) {
        await uploader.upload_file(fileInfo.data, onProgress);
      } else {
        let blob = new Blob([fileInfo.data], {
          type: "application/octet-stream",
        });
        let file = new File([blob], fileName, {
          type: "application/octet-stream",
        });
        await uploader.upload_file(file, onProgress);
      }
      console.log("sending finish request");
      let url = await uploader.finish();
      return { url: settings.instanceUrl + "/" + url.id };
    } catch (error) {
      console.log(error);
    }
    return undefined;
  },
);

browser.cloudFile.onFileUploadAbort.addListener(() => {
  console.log("abort");
});

function onProgress(progress: number) {
  console.log(progress);
}
