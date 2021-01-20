# C++ Test Generator

A nodejs script for generating test fixture files and unit tests stubs for the Titan Medical project.

## Prerequisites

- nodejs

## Usage

First, run `npm install` or `yarn install`

Run the command script with the following command line options. All arguments that don't have a default value are required.

For now you need to run it directly from the dist folder.

Example:

```
node dist/app.js --className DataStore --appGroup Boot --sourcePath /Users/jtuzman/dev/Titan/source/framework/framework/source --testPath /Users/jtuzman/dev/Titan/source/framework/framework/source/test/unit/FrameworkUnitTests --projectPath C:\Users\jtuzman\dev\Titan\source\framework\framework\projects\windows FrameworkUnitTests.vcxproj --force ```

| Alias | Name | Description | Type | Default |
|---|-------|---|---|---|
| `-c` | `--className` |   The name of the class to generate files for. | `string`
| `-f` | `--force` |    Write files even if they already exist, without asking.| `boolean` | `false`
| `-a` | `--appGroup` | The application group for the test. The fixture files will be written to "../${appGroup}", and in the VS project all the test files will go into the folder/filter for the appGroup | `string` | `"GeneratedTests"`
| `-s` | `--sourcePath` |   Absolute path to the source code folder, where the header file will be found. | `string`
| `-t` | `--testPath` | Absolute path to the tests folder. It is assumed that this folder has subfolders for app groups, and a folder called "UnitTests" for the test files. | `string`
| `-p` | `--projectPath` |  The project file (.vcxproj) for the project in which to include the new files. The .vcxproj and its corresponding `.vcxproj.filters` files will be used. | `string`
| |`--help`| Show help | `boolean`

## TODO:

- Build, change filename
- Check out different path starters/separators (see different formats in example above)
- Wrap in executable
