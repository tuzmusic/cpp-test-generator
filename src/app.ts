import fs from 'fs';
import { FileObject, TestGenerator } from './TestGenerator';
import { asyncWalk, defineYargs } from './runHelpers';
import * as path from 'path';
// @ts-ignore
import prompt from 'prompt';

// define at top, to capture variables
// yeah, this should all be a class.
const { className, appGroup, sourcePath, testPath, force, projectPath } = defineYargs();

// TODO: addToQNIXProject!
function addToWindowsProject(generator: TestGenerator, fullTestPath: string) {
  /* 1 include in project */
  // fulltest path C:\Users\jtuzman\dev\Titan\source\framework\framework\source\test\unit\FrameworkUnitTests\Boot
  // <ClCompile Include="..\..\source\test\unit\FrameworkUnitTests\Boot\DataStoreTest.h" />
  // <ClCompile Include="..\..\source\test\unit\FrameworkUnitTests\Boot\DataStoreTest.h" />

  // generate tags
  const [relativePath, separator] = fullTestPath.match(/(source(\S)test.*)/).slice(1); // get end of path
  const pathElements = relativePath.split(separator);

  type FullInfo = FileObject & { includeTag: string; filterTag: string }
  const newInfo = generator.getFileInfoObject();

  // generate tags
  Object.values(newInfo).forEach((item: FileObject & { includeTag: string; filterTag: string }) => {
    const fullIncludePath = ['..', '..', ...pathElements, item.fileName].join(separator);
    const tagContent = `ClCompile Include="${ fullIncludePath }"`;
    item.includeTag = `<${ tagContent } />`;
    item.filterTag = `<${ tagContent }>\n\t<Filter>${ appGroup }</Filter>\n\t</ClCompile>`;
  });

  // place in appropriate item group
  const projectFile = fs.readFileSync(projectPath).toString();
  const groupEnder = "</ItemGroup>";
  const [sourceGroup, headerGroup] = projectFile.match(/\<ItemGroup\>([^]*?)\<\/ItemGroup\>/g).slice(1);

  // PLACE SOURCE FILE AT END OF SOURCE GROUP
  const newSource = sourceGroup.replace(groupEnder,
    `\t${ (newInfo.fixtureSource as FullInfo).includeTag }\n${ groupEnder }`,
  );

  // PLACE HEADER FILE
  const newHeader = headerGroup.replace(groupEnder,
    `\t${ (newInfo.fixtureHeader as FullInfo).includeTag }\n${ groupEnder }`,
  );

  /* 2 include in filter */
  // generate tag
  // place in appropriate item group
}

function writeFiles(generator: TestGenerator, fullTestPath: string) {
  const { fixtureSource, unitTests, fixtureHeader } = generator.getFileInfoObject();

  if (!fs.existsSync(fullTestPath))
    fs.mkdirSync(fullTestPath, { recursive: true });

  const fixtureHeaderPath = path.resolve(fullTestPath, fixtureHeader.fileName);
  const fixtureSourcePath = path.resolve(fullTestPath, fixtureSource.fileName);
  const unitTestsPath = path.resolve(testPath, "UnitTests", unitTests.fileName);

  fs.writeFileSync(fixtureHeaderPath, fixtureHeader.fileText);
  fs.writeFileSync(fixtureSourcePath, fixtureSource.fileText);
  fs.writeFileSync(unitTestsPath, unitTests.fileText);
}

async function run(fullPath: string) {
  const ALLFilesInSourcePath = await asyncWalk(fullPath);
  const existingFixtures = ALLFilesInSourcePath.filter(file => file.match(RegExp(`${appGroup}\.${className}`)));
  const existingUnitTests = ALLFilesInSourcePath.filter(file => file.match(RegExp(`${className}UnitTest`)));
  const existingTests = [
    ...existingFixtures,
    ...existingUnitTests,
  ];

  // TODO: allow "force" option
  if (!force && existingTests.length) {
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

  // console.log(generator.getFileInfoObject().fixtureHeader.fileText);
  // console.log(generator.getFileInfoObject().fixtureSource.fileText);
  // console.log(generator.getFileInfoObject().unitTests.fileText);

  // make the fixtures (app group) folder if needed
  const fullTestPath = path.resolve(testPath, appGroup);

  writeFiles(generator, fullTestPath);
  console.log("Files created!");

  addToWindowsProject(generator, fullTestPath);
}

// TODO: Make sure source path parses correctly.
//  The "best" way to ensure this is to go from root: /Users/jtuzman/etc
run(sourcePath);
