import fs from 'fs';
import { TestGenerator } from './TestGenerator';
import { asyncWalk, defineYargs } from './runHelpers';
import * as path from 'path';

const { className, appGroup, sourcePath, testPath } = defineYargs();

async function run(fullPath: string) {
  const ALLFilesInSourcePath = await asyncWalk(fullPath);

  const existingTests = ALLFilesInSourcePath.filter(file =>
    file.match(RegExp(`${className}[Test|UnitTests]`)));

  if (existingTests.length) {
    console.log("Tests already exist at:\n\t", existingTests);
    return;
  }

  const headerPath = ALLFilesInSourcePath.find(file => file.endsWith(className + '.h'));

  const fileText = fs
    .readFileSync(headerPath)
    .toString();

  const generator = new TestGenerator(className, fileText, appGroup);

  console.log(generator.getFileInfoObject().fixtureHeader.fileText);
  console.log(generator.getFileInfoObject().fixtureSource.fileText);
  console.log(generator.getFileInfoObject().unitTests.fileText);

  // make the fixtures (app group) folder if needed
  const fullTestPath = path.resolve(testPath, appGroup);
  if (!fs.existsSync(fullTestPath))
    fs.mkdirSync(fullTestPath, { recursive: true });

  const { fixtureSource, unitTests, fixtureHeader } = generator.getFileInfoObject();

  let shouldWrite = true;
  // TODO: check for existing
  shouldWrite = false;
  if (!shouldWrite) return;

  fs.writeFileSync(path.resolve(fullTestPath, fixtureHeader.fileName), fixtureHeader.fileText);
  fs.writeFileSync(path.resolve(fullTestPath, fixtureSource.fileName), fixtureSource.fileText);
  fs.writeFileSync(path.resolve(testPath, "UnitTests", unitTests.fileName), unitTests.fileText);
}

// TODO: Make sure source path parses correctly.
//  The "best" way to ensure this is to go from root: /Users/jtuzman/etc
run(sourcePath);
