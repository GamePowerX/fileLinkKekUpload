# FileLinkKekUpload

A Thunderbird FileLink extension for uploading email attachments to a KekUpload instance.

## Requirements

- Node.js 20 or newer
- Yarn 1.22 or newer
- Thunderbird 78 or newer
- Access to a KekUpload-compatible server

## Install

Install the project dependencies from a fresh checkout:

```sh
yarn install
```

## Build

Build the extension into the `dist` directory:

```sh
yarn build
```

The build compiles the TypeScript sources, copies the extension HTML and manifest files, and bundles the background script with Browserify.

## Load In Thunderbird

1. Run `yarn build`.
2. Open Thunderbird.
3. Go to Add-ons and Themes.
4. Open the settings menu and choose Debug Add-ons.
5. Choose Load Temporary Add-on.
6. Select `dist/manifest.json`.

## Configure

After loading the extension, add or configure the FileLink account in Thunderbird and set:

- KekUpload instance URL
- Upload chunk size
- Whether uploads should include the original file name

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
