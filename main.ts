import { FileUploader } from "./libkekupload";
import { FileUploaderOptions } from "./libkekupload";

async function getSettings(accountId: string) {
    let settings = await browser.storage.local.get([accountId]);
    return settings[accountId];
}

browser.cloudFile.onFileUpload.addListener(async (account: browser.cloudFile.CloudFileAccount, fileInfo: browser.cloudFile.CloudFile) => {
    let settings = await getSettings(account.id);
    let uploader = new FileUploader({read_size: 1024*1024*32, chunk_size: settings.chunkSize, api: settings.instanceUrl});
    let fileName = "";
    let name = "";
    let ext = "";
    if(fileInfo.data instanceof File) {
        ext = fileName.split('.').pop() as string;
        name = fileName.split('.').slice(0, -1).at(0) as string;
    }else{
        name = fileInfo.name;
    }
    
    await uploader.begin(ext, name)
    if(fileInfo.data instanceof File) {
        await uploader.upload_file(fileInfo.data, onProgress);
    }else {
        let blob = new Blob([fileInfo.data], {type: "application/octet-stream"});
        let file = new File([blob], fileName, {type: "application/octet-stream"});
        await uploader.upload_file(file, onProgress);
    }
    let url = await uploader.finish();
    return {url: settings.instanceUrl + "/" + url.id};
});

browser.cloudFile.onFileUploadAbort.addListener(() => {
    console.log("abort");
});

function onProgress(progress: number) {
    console.log(progress);
}
