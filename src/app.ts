import yargs from 'yargs';
import fs from 'fs';
import path from 'path';

// const fileText = fs
//   .readFileSync(path.resolve(sourcePath, className + '.h'))
//   .toString(), { readdir } = require('fs').promises;
import { promisify } from 'util';

function defineYargs() {
  return yargs.option('className', {
    alias: 'c',
    description: 'The name of the class to generate files for.',
    type: 'string',
  }).option('appGroup', {
    alias: 'a',
    description: 'The application group for the test. The fixture files will be written to "../${appGroup}", and in the VS project all the test files will go into the folder/filter for the appGroup',
    type: 'string',
  })
    .option('sourcePath', {
      alias: 's',
      description: 'Absolute path to the source code folder, where the header file will be found.',
      type: 'string',
    })
    .option('testPath', {
      alias: 't',
      description: 'Absolute path to the tests folder. It is assumed that this folder has subfolders for app groups, and a folder called "UnitTests" for the test files.',
      type: 'string',
    })
    // .demandOption(['className', 'sourcePath'], 'You must provide a className and a sourcePath (where the header file will be found)')
    .help()
    .argv;
}

// search recursively for the header file within the sourcepath
const { className, appGroup, sourcePath } = defineYargs();

// const fs = require('fs');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

/*
async function getFiles(dir) {
  try {
    const subdirs = await readdir(dir);
    const files = await Promise.all(subdirs.map(async (subdir) => {
      const res = resolve(dir, subdir);
      return (await stat(res)).isDirectory() ? getFiles(res) : res;
    }));
  return files.reduce((a: Array<any>, f: any) => a.concat(f), []);
  } catch (e) {
    console.log(e);
    console.log(e);
  }
}
*/

const walk = (dir: string, done: Function) => {
  let results: any[] = [];
  fs.readdir(dir, (err, list) => {
    if (err)
      return done(err);

    let i = 0;
    const next = () => {
      let file = list[i++];
      if (!file)
        return done(null, results);

      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err: Error, res: string) => {
            results = results.concat(res);
            next();
          });
        } else {
          results.push(file);
          next();
        }
      });
    };

    next();
  });
};

const fullPath = "/Users/jtuzman/dev/Titan/source/framework/framework/source";
const ALLFilesInSourcePath = walk(
  path.resolve(fullPath),
  (err: any, results: any) => {
    if (err) throw err;
    console.log(results);
  });

// const headerPath = ALLFilesInSourcePath.find(file => file.endsWith(className+'.h'))
