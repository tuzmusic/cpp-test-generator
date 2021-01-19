import { TestGenerator } from '../src/TestGenerator';
import * as path from 'path';
import fs from 'fs';

describe("app", () => {

  it("creates header/source files for the test fixture, and the unit test file", () => {
    const gen = new TestGenerator('SomeClass', "");
    const { fixtureHeader, fixtureSource, unitTests } = gen.getFileInfoObject();
    expect(fixtureHeader.fileName).toEqual('SomeClassTest.h');
    expect(fixtureSource.fileName).toEqual('SomeClassTest.cpp');
    expect(unitTests.fileName).toEqual('SomeClassUnitTests.cpp');
  });

  describe('unit test file', () => {
    const thisClassName = 'DataStore';
    const fileText = fs
      .readFileSync(path.resolve('test', 'fixtures', thisClassName + '.h'))
      .toString();

    // in a function to make sure we get it fresh every time
    const getLines = () => fileText.replace(/\r\n/g, '\n').split('\n');

    it('stubs tests for each public function, and numbers duplicates/overloads', () => {
      const gen = new TestGenerator(thisClassName, fileText);

      const publics = ['Create1', 'Create2', 'Destroy'];
      publics.forEach(fnName => {
        expect(gen.getFileInfoObject().unitTests.fileText)
          .toEqual(expect.stringContaining(`TEST_F(${ thisClassName }Test, ${ fnName })`));
      });
    });

    xit('stubs tests for the constructor and destructor', () => {
      const gen = new TestGenerator(thisClassName, fileText);

      const publics = ['Constructor', 'Destructor'];
      publics.forEach(fnName => {
        expect(gen.getFileInfoObject().unitTests.fileText)
          .toEqual(expect.stringContaining(`TEST_F(${ thisClassName }Test, ${ fnName })`));
      });

    });

    xit('includes the @brief and function signature as comments', () => {

    });
  });
});
