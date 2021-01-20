import fs from 'fs';
import { FileObject, TestGenerator } from './TestGenerator';
import { asyncWalk, defineYargs } from './runHelpers';
import * as path from 'path';
// @ts-ignore
import prompt from 'prompt';

type FullInfo = FileObject & { includeTag: string; filterTag: string }

// define at top, to capture variables
// yeah, this should all be a class.
const { className, appGroup, sourcePath, testPath, force, projectPath } = defineYargs();

// TODO: addToQNIXProject!
// todo: check whether it's there already
function addToWindowsProject(generator: TestGenerator, fullTestPath: string) {

  //region SETUP
  const newInfo = generator.getFileInfoObject();

  // we can't use path.resolve because we want to keep it as a relative path, for the project file.
  const [relativePath, separator] = fullTestPath.match(/(source(\S)test.*)/).slice(1); // get end of path
  const pathElements = relativePath.split(separator);

  // get text from the files
  const projectFileText = fs.readFileSync(projectPath).toString();
  const filterFileText = fs.readFileSync(projectPath + '.filters').toString();

  // info for parsing/reconstructing the markup
  const groupEnder = "</ItemGroup>";
  // too problematic to use the variable with all the slashes/escapes
  const itemGroupRegex = /<ItemGroup>([^]*?)<\/ItemGroup>/g;

  // convenience functions
  const placeTagAtEnd = (sourceStr: string, key: keyof FullInfo, info: FullInfo): string =>
    sourceStr.replace(groupEnder, `\t${ info[key] }\n${ groupEnder }`);
  const placeFileTagAtEnd = (src: string, info: FullInfo): string => placeTagAtEnd(src, 'includeTag', info);
  const placeFilterTagAtEnd = (src: string, info: FullInfo): string => placeTagAtEnd(src, 'filterTag', info);

  // captures pathElements
  const generateTag = (fileInfo: FileObject & { includeTag: string; filterTag: string }) => {
    // newInfo includes the methods object, which we actually want to ignore
    if (!fileInfo.fileName) return;

    // construct the actual path for this file
    const fullIncludePath = [
      '..', '..', ...pathElements, // relative path
      fileInfo.fileName.includes('UnitTest') ? 'UnitTests' : appGroup, // containing folder within test project
      fileInfo.fileName,
    ].join(separator);

    const tagContent = `Include="${ fullIncludePath }"`;
    fileInfo.includeTag = `<ClCompile ${ tagContent } />`;
    fileInfo.filterTag = `<ClInclude ${ tagContent }>\n\t\t<Filter>${ appGroup }</Filter>\n\t</ClInclude>`;
  };
  //endregion SETUP

  Object.values(newInfo).forEach(generateTag);

  //region INCLUDE IN PROJECT
  const [sourceGroup, headerGroup] = projectFileText.match(itemGroupRegex).slice(1);
  // place source file at end of source group
  let newSource = placeFileTagAtEnd(sourceGroup, newInfo.fixtureSource as FullInfo);
  // place unit test file at end of source group (using the result of the last call)
  newSource = placeFileTagAtEnd(newSource, newInfo.unitTests as FullInfo);
  // place header file at end of header group
  const newHeader = placeFileTagAtEnd(headerGroup, newInfo.fixtureHeader as FullInfo);

  let newProjectFileText = projectFileText
    .replace(sourceGroup, newSource)
    .replace(headerGroup, newHeader);
  //endregion

  //region INCLUDE IN FILTER
  // todo: create the group if needed
  const [filterSourceGroup, filterHeaderGroup] = filterFileText.match(itemGroupRegex).slice(1);
  // place source file at end of source group
  let newFilterSource = placeFilterTagAtEnd(filterSourceGroup, newInfo.fixtureSource as FullInfo);
  // place unit test file at end of source group (using the result of the last call)
  newFilterSource = placeFilterTagAtEnd(newFilterSource, newInfo.unitTests as FullInfo);
  // place header file at end of header group
  const newFilterHeader = placeFilterTagAtEnd(filterHeaderGroup, newInfo.fixtureHeader as FullInfo);

  let newFilterFileText = filterFileText
    .replace(filterSourceGroup, newFilterSource)
    .replace(filterHeaderGroup, newFilterHeader);
  //endregion

  // todo: write the files (back up first???)
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
