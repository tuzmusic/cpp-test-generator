import fs from 'fs';
import { TestGenerator } from './TestGenerator';
import { asyncWalk, defineYargs } from './runHelpers';
import * as path from 'path';
// @ts-ignore
import prompt from 'prompt';

const { className, appGroup, sourcePath, testPath } = defineYargs();

async function run(fullPath: string) {
  const ALLFilesInSourcePath = await asyncWalk(fullPath);

  const existingFixtures = ALLFilesInSourcePath.filter(file => file.match(RegExp(`${appGroup}\.${className}`)));
  const existingUnitTests = ALLFilesInSourcePath.filter(file => file.match(RegExp(`${className}UnitTest`)));
  const existingTests = [
    ...existingFixtures,
    ...existingUnitTests,
  ];

  // TODO: allow "force" option
  if (existingTests.length) {
    const promptSchema = {
      properties: {
        shouldProceed: {
          description: 'Proceed anyway and overwrite the files? [Y/n]',
          type: 'string',
          default: 'y',
        },
      },
    };

    console.log("\nWARNING: Tests already exist at:\n\t", existingTests);
    prompt.start();
    const { shouldProceed } = await prompt.get(promptSchema);
    if (shouldProceed.toLowerCase() !== 'y') return;
  }

  const headerPath = ALLFilesInSourcePath.find(file => file.endsWith(className + '.h'));

  const fileText = fs
    .readFileSync(headerPath)
    .toString();

  const generator = new TestGenerator(className, fileText, appGroup);

  console.log("Files created!");
  // console.log(generator.getFileInfoObject().fixtureHeader.fileText);
  // console.log(generator.getFileInfoObject().fixtureSource.fileText);
  // console.log(generator.getFileInfoObject().unitTests.fileText);

  // make the fixtures (app group) folder if needed
  const fullTestPath = path.resolve(testPath, appGroup);
  if (!fs.existsSync(fullTestPath))
    fs.mkdirSync(fullTestPath, { recursive: true });

  const { fixtureSource, unitTests, fixtureHeader } = generator.getFileInfoObject();

  fs.writeFileSync(path.resolve(fullTestPath, fixtureHeader.fileName), fixtureHeader.fileText);
  fs.writeFileSync(path.resolve(fullTestPath, fixtureSource.fileName), fixtureSource.fileText);
  fs.writeFileSync(path.resolve(testPath, "UnitTests", unitTests.fileName), unitTests.fileText);
}

// TODO: Make sure source path parses correctly.
//  The "best" way to ensure this is to go from root: /Users/jtuzman/etc
run(sourcePath);
