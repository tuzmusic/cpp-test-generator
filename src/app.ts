import fs from 'fs';
import { FileObject, TestGenerator } from './TestGenerator';
import { asyncWalk, defineYargs } from './runHelpers';
import * as path from 'path';
// @ts-ignore
import prompt from 'prompt';

type FullInfo = FileObject & { includeTag: string; filterTag: string }

// define at top, to capture variables
// yeah, this should all be a class.
const args = defineYargs();
const { sourcePath, testPath, force, projectPath } = args;
let { className, appGroup } = args;

async function handleEmptyArgs() {
  const classSchema = {
    properties: {
      _className: {
        description: 'Enter the name of the class you want to test. Just the name, no extension.',
        type: 'string',
      },
    },
  };
  const groupSchema = {
    properties: {
      _appGroup: {
        description: 'Enter the name of the group where these tests should go.',
        type: 'string',
        default: 'GeneratedTests',
      },
    },
  };

  if (!className) {
    prompt.start();
    const { _className } = await prompt.get(classSchema);
    className = _className;
  }
  if (!appGroup) {
    prompt.start();
    const { _appGroup } = await prompt.get(groupSchema);
    appGroup = _appGroup;
  }
}

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
    fileInfo.filterTag = `<ClInclude ${ tagContent }>\n\t\t\t<Filter>${ appGroup }</Filter>\n\t\<t></t></ClInclude>`;
  };
  //endregion SETUP
  if (projectFileText.includes(newInfo.fixtureHeader.fileName)) {
    const errorStr = ["It looks like the files were already included in the project.",
      `"${ newInfo.fixtureHeader.fileName }" was found in the project file.`,
      "Duplicate includes in these project files will cause problem, so the script will now quit.",
    ].join('\n');
    console.log(errorStr);
    return;
  }

  Object.values(newInfo).forEach(generateTag);

  //region INCLUDE IN PROJECT
  const [sourceGroup, headerGroup] = projectFileText.match(itemGroupRegex).slice(1);
  // place source file at end of source group
  let newSource = placeFileTagAtEnd(sourceGroup, newInfo.fixtureSource as FullInfo);
  // place unit test file at end of source group (using the result of the last call)
  newSource = placeFileTagAtEnd(newSource, newInfo.unitTests as FullInfo);
  // place header file at end of header group
  const newHeader = placeFileTagAtEnd(headerGroup, newInfo.fixtureHeader as FullInfo);

  const newProjectFileText = projectFileText
    .replace(sourceGroup, newSource)
    .replace(headerGroup, newHeader);
  //endregion

  //region INCLUDE IN FILTER
  const [filterListGroup, filterSourceGroup, filterHeaderGroup] = filterFileText.match(itemGroupRegex);
  let newFilterListGroup = filterListGroup;

  // create the group if needed
  if (-1 === filterListGroup.search(`Filter Include="${ appGroup }"`)) {
    newFilterListGroup = filterListGroup
      .replace(groupEnder, `\t\t<Filter Include="${ appGroup }" />\n${ groupEnder }`);
  }

  // place source file at end of source group
  let newFilterSource = placeFilterTagAtEnd(filterSourceGroup, newInfo.fixtureSource as FullInfo);
  // place unit test file at end of source group (using the result of the last call)
  newFilterSource = placeFilterTagAtEnd(newFilterSource, newInfo.unitTests as FullInfo);
  // place header file at end of header group
  const newFilterHeader = placeFilterTagAtEnd(filterHeaderGroup, newInfo.fixtureHeader as FullInfo);

  const newFilterFileText = filterFileText
    .replace(filterListGroup, newFilterListGroup)
    .replace(filterSourceGroup, newFilterSource)
    .replace(filterHeaderGroup, newFilterHeader);
  //endregion

  // todo: write the files (back up first???)
  fs.writeFileSync(projectPath, newProjectFileText);
  fs.writeFileSync(projectPath + '.filters', newFilterFileText);

  console.log("DONE.");
}

function writeTestFiles(generator: TestGenerator, fullTestPath: string) {
  const { fixtureSource, unitTests, fixtureHeader } = generator.getFileInfoObject();

  if (!fs.existsSync(fullTestPath))
    fs.mkdirSync(fullTestPath, { recursive: true });

  const fixtureHeaderPath = path.resolve(fullTestPath, fixtureHeader.fileName);
  const fixtureSourcePath = path.resolve(fullTestPath, fixtureSource.fileName);
  const unitTestsPath = path.resolve(testPath, "UnitTests", unitTests.fileName);

  fs.writeFileSync(fixtureHeaderPath, fixtureHeader.fileText);
  fs.writeFileSync(fixtureSourcePath, fixtureSource.fileText);
  fs.writeFileSync(unitTestsPath, unitTests.fileText);

  console.log("DONE.");
}

async function run(fullPath: string) {
  await handleEmptyArgs();

  const ALLFilesInSourcePath = await asyncWalk(fullPath);
  const existingFixtures = ALLFilesInSourcePath.filter(file => file.match(RegExp(`${appGroup}\.${className}`)));
  const existingUnitTests = ALLFilesInSourcePath.filter(file => file.match(RegExp(`${className}UnitTest`)));
  const existingTests = [
    ...existingFixtures,
    ...existingUnitTests,
  ];

  // TODO: allow "force" option
  if (!force && existingTests.length) {
    const proceedSchema = {
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
    const { shouldProceed } = await prompt.get(proceedSchema);
    if (shouldProceed.toLowerCase() !== 'y') return;
  }

  const headerPath = ALLFilesInSourcePath.find(file => file.endsWith(className + '.h'));

  const fileText = fs.readFileSync(headerPath).toString();

  const generator = new TestGenerator(className, fileText, appGroup);

  // console.log(generator.getFileInfoObject().fixtureHeader.fileText);
  // console.log(generator.getFileInfoObject().fixtureSource.fileText);
  // console.log(generator.getFileInfoObject().unitTests.fileText);

  // make the fixtures (app group) folder if needed
  const fullTestPath = path.resolve(testPath, appGroup);

  console.log("Writing test files...");
  writeTestFiles(generator, fullTestPath);
  console.log();
  console.log("Including new files in project...");
  addToWindowsProject(generator, path.resolve(testPath));
}

// TODO: Make sure source path parses correctly.
//  The "best" way to ensure this is to go from root: /Users/jtuzman/etc
run(sourcePath);
