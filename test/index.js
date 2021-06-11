const { dedup, redup } = require('../index.js');
const globby = require('globby');
const fs = require('fs');
const fse = require('fs-extra');
const childProcess = require('child_process');

var keeps = [];

async function clean() {
  (await globby('test/**/.keep')).forEach((file) => {
    fs.unlinkSync(file);
    keeps.push(file);
  });
  globalThis.keeps = keeps;
  if (fs.existsSync('test/duplicate')) {
    fs.rmSync('test/duplicate', { recursive: true, force: true });
  }
  fs.mkdirSync('test/duplicate');
}

function restoreKeeps() {
  keeps.forEach((keep) => {
    fs.writeFileSync(keep, '');
  });
}

async function dedupDuplicate() {
  if (!fs.existsSync('test/duplicate')) {
    fs.mkdirSync('test/duplicate');
  }
  for (dir of await globby('test/input*', { onlyDirectories: true })) {
    fse.copySync(dir, 'test/duplicate/' + dir.split('/')[1]);
  }
}

QUnit.module('dedup', {
  async before() {
    await clean();
    await dedupDuplicate();
  },
  async after() {
    await clean();
    restoreKeeps();
  }
});

var inputOutputs = [];
fs.readdirSync('./test').forEach((folder) => {
  if (!fs.statSync('test/' + folder).isDirectory() || folder === 'duplicate') {
    return;
  }
  var found = inputOutputs.find((inputOutput) => Object.values(inputOutput).find((entry) => entry.endsWith(folder[folder.length - 1])));
  if (found && !found[folder.replaceAll(/\d/g, '')] && found[folder.startsWith('input') ? 'output' : 'input']) {
    if (folder.startsWith('input')) {
      found.input = folder;
    } else {
      found.output = folder;
    }
  } else if (!found) {
    inputOutputs.push({
      [folder.replaceAll(/\d/g, '')]: folder
    });
  } else {
    throw new Error('Failure in finding folders');
  }
});

QUnit.test('files given', (assert) => {
  Object.values(inputOutputs).forEach((inputOutput) => {
    assert.notEqual(inputOutput.input);
    assert.notEqual(inputOutput.output);
  });
});

QUnit.test('dedups correctly', async (assert) => {
  for (inputOutput of inputOutputs) {
    dedup('test/duplicate/' + inputOutput.input);
    childProcess.exec('diff -q test/duplicate/' + inputOutput.input + ' test/' + inputOutput.output, (error, stdout, stderr) => {
      assert.equal(error, null);
      assert.equal(stderr, '');
      assert.deepEqual(
        stdout.split('\n').filter((line) => line.length > 0 && !line.startsWith('Common subdirectories')),
        []
      );
    });
  }
});

async function redupDuplicate() {
  if (!fs.existsSync('test/duplicate')) {
    fs.mkdirSync('test/duplicate');
  }
  for (dir of await globby('test/output*', { onlyDirectories: true })) {
    fse.copySync(dir, 'test/duplicate/' + dir.split('/')[1]);
  }
  for (file of await globby('test/duplicate/output*/.redup.json')) {
    fs.writeFileSync(
      file,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(JSON.parse(fs.readFileSync(file, 'utf-8'))).map((entry) => [
            entry[0].replace('input', 'output'),
            entry[1].map((dup) => dup.replace('input', 'output'))
          ])
        )
      )
    );
  }
}

QUnit.module('redup', {
  async before() {
    await clean();
    await redupDuplicate();
  },
  async after() {
    await clean();
    restoreKeeps();
  }
});

QUnit.test('redups correctly', (assert) => {
  for (inputOutput of inputOutputs) {
    redup('test/duplicate/' + inputOutput.output);
    childProcess.exec('diff -q test/duplicate/' + inputOutput.output + ' test/' + inputOutput.input, (error, stdout, stderr) => {
      assert.equal(error, null);
      assert.equal(stderr, '');
      assert.deepEqual(
        stdout.split('\n').filter((line) => line.length > 0 && !line.startsWith('Common subdirectories')),
        []
      );
    });
  }
});
