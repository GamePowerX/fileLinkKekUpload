# FileLinkKekUpload

![FileLinkKekUpload icon](icon.png)

A Thunderbird FileLink extension for uploading email attachments to a KekUpload instance.

## Requirements

- Node.js 20 or newer
- Yarn 1.22 or newer
- Thunderbird 78 or newer
- Access to a KekUpload-compatible server

## Install

Install the project dependencies from a fresh checkout:

```sh
yarn install --frozen-lockfile
```

## Build

Build the extension from source into the `dist` directory:

```sh
yarn build
```

The build runs these steps:

1. Remove the previous `dist` directory.
2. Compile TypeScript with `tsc -p .` into `dist`.
3. Copy only the extension package assets: `management.html`, `icon-48.png`, `icon-96.png`, and `manifest.json`.
4. Bundle `dist/main.js` with Browserify so the published package contains the required dependencies.

Validate the built extension:

```sh
yarn web-ext lint -s dist
```

Create a package for submission or local installation:

```sh
yarn package
```

This command compiles the extension and creates an XPI file in the `web-ext-artifacts` directory. Use `--overwrite-dest` flag to automatically overwrite existing files.

For source review, use Node.js 20 or newer with Yarn 1.22.22 and run the commands above from a clean checkout. The `yarn.lock` file is required so reviewers install the same dependency versions.

## Load In Thunderbird

1. Run `yarn build`.
2. Open Thunderbird.
3. Go to Add-ons and Themes.
4. Open the settings menu and choose Debug Add-ons.
5. Choose Load Temporary Add-on.
6. Select `dist/manifest.json`.

## Configure

After loading the extension, add or configure the FileLink account in Thunderbird and set:

- KekUpload instance URL. Use the server root URL, not an `/api` URL.
- Upload chunk size in bytes.
- Whether uploads should include the original file name.

Finished uploads cannot be deleted by this extension. Remove files directly from the configured KekUpload server manually.

## Development

Compile TypeScript in watch mode:

```sh
yarn watch
```

Format the repository:

```sh
yarn format
```

## License

This project is licensed under the GNU General Public License v3.0 only. See `LICENSE` for the full license text.
