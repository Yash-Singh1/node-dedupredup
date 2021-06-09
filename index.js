const fs = require('fs');
const path = require('path');
const sha512sum = require('sha512sum');

function recursiveGetFiles(dir) {
  let files = [];
  fs.readdirSync(dir)
    .map((entry) => path.join(dir, entry))
    .forEach((entryPath) => {
      let pathInfo = fs.statSync(entryPath);
      if (pathInfo.isDirectory()) {
        files = files.concat(recursiveGetFiles(entryPath));
      } else {
        files.push({ name: entryPath, length: pathInfo.size });
      }
    });
  return files;
}

module.exports = {
  /**
   * Remove duplicate files from a directory
   * @param {string} dir The directory to remove duplicate files from
   * @returns {Object<Array<String>>} The resulting .redup.json (it is already written)
   */
  dedup(dir = '.') {
    let files = recursiveGetFiles(dir);
    let lengthObj = Object.fromEntries(files.map((file) => [file.length, []]));
    files.forEach((file) => {
      lengthObj[file.length].push(file.name);
    });
    lengthObj = Object.fromEntries(Object.entries(lengthObj).filter((entry) => entry[1].length > 1));
    lengthObj = Object.values(lengthObj).flatMap((lengthGroup) => {
      let contentGroup = [];
      lengthGroup.forEach((fileName) => {
        let fileContent = sha512sum.fromFileSync(fileName).split(' ')[0];
        let contentFind = contentGroup.find((group) => group.content === fileContent);
        if (contentFind) {
          contentFind.name.push(fileName);
        } else {
          contentGroup.push({ name: [fileName], content: fileContent });
        }
      });
      return contentGroup;
    });
    lengthObj.forEach((group) => {
      group.name.slice(1).forEach((name) => fs.unlinkSync(name));
    });
    let redupJSON = Object.fromEntries(lengthObj.map((group) => [group.name[0], group.name.slice(1)]).filter((group) => group[1].length > 0));
    if (Object.keys(redupJSON).length === 0) return;
    fs.writeFileSync(path.join(dir, '.redup.json'), JSON.stringify(redupJSON));
    return redupJSON;
  },

  /**
   * Rebuild the directory after deduping it
   * @param {string} dir The directory to rebuild
   */
  redup(dir = '.') {
    if (!fs.existsSync(path.join(dir, '.redup.json'))) {
      return;
    }
    let config = JSON.parse(fs.readFileSync(path.join(dir, '.redup.json'), 'utf8'));
    Object.entries(config).forEach((file) => {
      let fileContent = fs.readFileSync(file[0]);
      file[1].forEach((removedFile) => {
        fs.writeFileSync(removedFile, fileContent);
      });
    });
    fs.unlinkSync(path.join(dir, '.redup.json'));
  }
};
