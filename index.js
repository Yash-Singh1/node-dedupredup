const fs = require('fs');
const path = require('path');

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

function getEmptyDirectories(dir) {
  let emptyDirs = [];
  fs.readdirSync(dir)
    .map((entry) => path.join(dir, entry))
    .filter((pathName) => fs.statSync(pathName).isDirectory())
    .forEach((directory) => {
      if (fs.readdirSync(directory).length === 0) {
        emptyDirs.push(directory);
      } else {
        emptyDirs.concat(getEmptyDirectories(directory));
      }
    });
  return emptyDirs;
}

module.exports = {
  /**
   * Remove duplicate files from a directory
   * @param {string} dir The directory to remove duplicate files from
   * @returns {{ emptyDirectories: Array<String>, matchingFiles: Object<Array<String>> }} The resulting .redup.json (it is already written)
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
        let fileContent = fs.readFileSync(fileName, 'utf8');
        let contentFind = contentGroup.find((group) => group.content === fileContent);
        if (contentFind) {
          contentFind.name.push(fileName);
        } else {
          contentGroup.push({ name: [fileName], content: fileContent });
        }
      });
      return contentGroup;
    });
    let emptyDirectories = getEmptyDirectories(dir);
    lengthObj.forEach((group) => {
      group.name.slice(1).forEach((name) => fs.unlinkSync(name));
    });
    emptyDirectories = getEmptyDirectories(dir).filter((emptyDir) => !emptyDirectories.includes(emptyDir));
    emptyDirectories.forEach((emptyDir) => {
      fs.rmdirSync(emptyDir);
    });
    let redupJSON = {
      emptyDirectories: [...emptyDirectories].map((dirName) => path.relative('.', dirName)),
      matchingFiles: Object.fromEntries(lengthObj.map((group) => [group.name[0], group.name.slice(1)]).filter((group) => group[1].length > 0))
    };
    if (Object.keys(redupJSON.matchingFiles).length === 0) return;
    fs.writeFileSync(path.join(dir, '.redup.json'), JSON.stringify(redupJSON));
    return redupJSON;
  },
  /**
   * Rebuild the directory after deduping it
   * @param {string} dir The directory to rebuild
   */
  redup(dir = '.') {
    let config = JSON.parse(fs.readFileSync(path.join(dir, '.redup.json'), 'utf8'));
    config.emptyDirectories.forEach((emptyDir) => {
      fs.mkdirSync(emptyDir);
    });
    Object.entries(config.matchingFiles).forEach((file) => {
      let fileContent = fs.readFileSync(file[0]);
      file[1].forEach((removedFile) => {
        fs.writeFileSync(removedFile, fileContent);
      });
    });
    fs.unlinkSync(path.join(dir, '.redup.json'));
  }
};
