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
// todo: check whether it's there already
function addToWindowsProject(generator: TestGenerator, fullTestPath: string) {
  type FullInfo = FileObject & { includeTag: string; filterTag: string }
  const newInfo = generator.getFileInfoObject();

  /* generate tags */
  // pre-prepare the path
  const [relativePath, separator] = fullTestPath.match(/(source(\S)test.*)/).slice(1); // get end of path
  const getPathElements = () => relativePath.split(separator);

  // actually generate the tags (including for the filter, to be used later)
  Object.values(newInfo).forEach((fileInfo: FileObject & { includeTag: string; filterTag: string }) => {
    // newInfo includes the methods object, which we actually want to ignore
    if (!fileInfo.fileName) return;

    // unit tests path is different. so we'll handle that here
    // getPathElements.push(fileInfo.fileName.includes('UnitTest') ? 'UnitTests' : appGroup);
    // if (fileInfo.fileName.includes('UnitTest')) {
    //   pathElements.pop();
    // }
    const fullIncludePath = ['..', '..', ...getPathElements(),

      fileInfo.fileName.includes('UnitTest') ? 'UnitTests' : appGroup,
      fileInfo.fileName].join(separator);
    const tagContent = `ClCompile Include="${ fullIncludePath }"`;
    fileInfo.includeTag = `<${ tagContent } />`;
    fileInfo.filterTag = `<${ tagContent }>\n\t\t<Filter>${ appGroup }</Filter>\n\t</ClCompile>`
      .replace(/Compile/g, 'Include');
  });

  //region INCLUDE IN PROJECT
  // place in appropriate item group
  const projectFileText = fs.readFileSync(projectPath).toString();
  const groupEnder = "</ItemGroup>";
  const itemGroupRegex = /<ItemGroup>([^]*?)<\/ItemGroup>/g;
  const [sourceGroup, headerGroup] = projectFileText.match(itemGroupRegex).slice(1);

  const placeFileTagAtEnd = (sourceStr: string, info: FullInfo): string =>
    sourceStr.replace(groupEnder, `\t${ info.includeTag }\n${ groupEnder }`);

  // place source file at end of source group
  let newSource = placeFileTagAtEnd(sourceGroup, newInfo.fixtureSource as FullInfo);
  // place unit test file at end of source group (using the result of the last call)
  newSource = placeFileTagAtEnd(newSource, newInfo.unitTests as FullInfo);
  // place header file at end of header group
  const newHeader = placeFileTagAtEnd(headerGroup, newInfo.fixtureHeader as FullInfo);

  let newProjectFileText = projectFileText.replace(sourceGroup, newSource).replace(headerGroup, newHeader);

  // todo: write the file (back up first???)
  //endregion

  /* 2 include in filter */
  // place in appropriate item group
  const filterFileText = fs.readFileSync(projectPath + '.filters').toString();
  // todo: create group if needed
  const [filterSourceGroup, filterHeaderGroup] = filterFileText.match(itemGroupRegex).slice(1);
  const placeFilterTagAtEnd = (sourceStr: string, info: FullInfo): string =>
    sourceStr.replace(groupEnder, `\t${ info.filterTag }\n${ groupEnder }`);

  // place source file at end of source group
  let newFilterSource = placeFilterTagAtEnd(filterSourceGroup, newInfo.fixtureSource as FullInfo);
  // place unit test file at end of source group (using the result of the last call)
  newFilterSource = placeFilterTagAtEnd(newFilterSource, newInfo.unitTests as FullInfo);
  // place header file at end of header group
  const newFilterHeader = placeFilterTagAtEnd(filterHeaderGroup, newInfo.fixtureHeader as FullInfo);
  let newFilterFileText = filterFileText.replace(filterSourceGroup, newFilterSource).replace(filterHeaderGroup, newFilterHeader);

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
  // console.log("Files created!");

  addToWindowsProject(generator, path.resolve(testPath));
}

// TODO: Make sure source path parses correctly.
//  The "best" way to ensure this is to go from root: /Users/jtuzman/etc
run(sourcePath);
