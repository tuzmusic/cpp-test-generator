import fs from 'fs';
import { TestGenerator } from './TestGenerator';
import { asyncWalk, defineYargs } from './runHelpers';

const { className, appGroup, sourcePath } = defineYargs();

async function run(fullPath: string) {
  const ALLFilesInSourcePath = await asyncWalk(fullPath);
  const headerPath = ALLFilesInSourcePath.find(file => file.endsWith(className + '.h'));
  console.log(headerPath);

  const fileText = fs
    .readFileSync(headerPath)
    .toString();

  const generator = new TestGenerator(className, fileText);

  console.log(generator.getFileInfoObject().fixtureHeader.fileText);
  console.log(generator.getFileInfoObject().fixtureSource.fileText);
  console.log(generator.getFileInfoObject().unitTests.fileText);
}

// TODO: Make sure source path parses correctly.
//  The "best" way to ensure this is to go from root: /Users/jtuzman/etc
run(sourcePath);
