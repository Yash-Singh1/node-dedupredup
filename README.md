# `node-dedupredup`

Solution for removing duplicates and rebuilding the directory in `NodeJS`. Useful for directories and repositories with duplicate files or folders.

## Installation

```sh
npm install node-dedupredup
```

## API

### Example

```js
const { dedup, redup } = require('node-dedupredup');
dedup('directory/with/duplicates');
redup('previously/deduped/directory/to/rebuild');
```

When running `dedup`, a `.redup.json` file will be created at the root of the directory specified as the argument. This JSON file will contain all of the information for rebuilding the directory. The `redup` method will not work without a `.redup.json` file.

### dedup

- Type: `function`
- Paramaters: `dir`: `string`

The dedup function will take the `dir` given and remove duplicate files. The result that will be returned will be the contents of the new `.redup.json` (parsed).

### redup

- Type: `function`
- Paramaters: `dir`: `string`

The redup function will rebuild the `dir` directory given using the `.redup.json` present.

## Related

See the CLI for this package: [`dedupredup-cli`](https://github.com/Yash-Singh1/dedupredup-cli)
