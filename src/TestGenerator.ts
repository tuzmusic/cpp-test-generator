type FileObject = {
  fileName: string;
  fileText: string;
}
type FilesInfoObject = {
  fixtureHeader: FileObject;
  fixtureSource: FileObject;
  unitTests: FileObject;
}

interface MethodInfo {
  name: string;
  signature: string;
}

/*
* From the command line, pass in a class name.
* From code, create a test generator with a class name, and the contents of a file, as a string.
* This means that the outer "main function" will open the file.
*
* The class "returns" a FileInfoObject, which is used (by the surrounding function)
* to write the files.
* */
export class TestGenerator {

  private fixtureHeader: FileObject;
  private fixtureSource: FileObject;
  private unitTests: FileObject;
  private fileLines: string[];
  private methods: MethodInfo[] = [];

  constructor(private className: string, private fileText: string) {
    // split the file lines. not sure how we're going to want them.
    this.fileLines = this.fileText.replace(/\r\n/g, '\n').split('\n');

    // remove everything after private
    this.fileText = this.fileText.split('private:')[0];

    this.createInfoObjects();
    this.generateUnitTests();
  }

  public getFileInfoObject(): FilesInfoObject {
    const { fixtureHeader, fixtureSource, unitTests } = this;
    return {
      fixtureHeader: { ...fixtureHeader },
      fixtureSource: { ...fixtureSource },
      unitTests: { ...unitTests },
    };
  }

  private createInfoObjects() {
    // create info objects
    this.fixtureHeader = {
      fileName: this.className + 'Test.h',
      fileText: "",
    };
    this.fixtureSource = {
      fileName: this.className + 'Test.cpp',
      fileText: "",
    };
    this.unitTests = {
      fileName: this.className + 'UnitTests.cpp',
      fileText: "",
    };
  }

  private parseMethods() {
    // this gets from the line with "@return"
    // to the end of the method declaration:
    const returnDocToEndOfDeclaration = /\* @return.[^]*?\)/g;
    const allMethods = this.fileText.match(returnDocToEndOfDeclaration);
    const methods: MethodInfo[] = [];

    allMethods.forEach(text => {
      // from that one above, this gets the function signature
      const functionSignature = /\n\W*(.*)/;
      const sigMatch = text.match(functionSignature);

      // from that one above, this gets the name of the method
      // it also includes an optional leading tilde for destructors
      const dataNameFromDeclLines = /(~?\w*)\s?\(/;
      const nameMatch = text.match(dataNameFromDeclLines);

      const method: MethodInfo = {
        name: nameMatch?.length > 1 ? nameMatch[1] : "not found",
        signature: sigMatch?.length > 1 ? sigMatch[1] : "not found",
      };
      methods.push(method);
    });
    this.methods = methods;
    console.log(JSON.stringify(methods, null, 2));
  }

  private generateUnitTests() {
    const { className, methods } = this;
    const headerLines = [
      // todo
      `#include "../GeneratedTests/${ className }.h"`,
      `#include "${ className }.h"`,
      `#include "gtest/gtest.h"`,
      "",
      "namespace Test",
      "{",
    ];

    this.parseMethods();

    const methodTestLines: string[] = [];
    this.methods.forEach((method: MethodInfo) => {
      const { name, signature } = method;
      let nameToUse = name;

      // constructor/destructor
      if (name.includes(className)) {
        nameToUse = name.startsWith('~') ? 'Destructor' : 'Constructor';
      }

      // manage overloads
      const methodsWithThisName = methods.filter(m => m.name === name);
      if (methodsWithThisName.length > 1) {
        const methodFromArray = methodsWithThisName.find(m => m.signature === signature);
        const indexOfOverload = methodsWithThisName.indexOf(methodFromArray);
        nameToUse += `_overload_${ indexOfOverload + 1 }`;
      }

      const methodLines: string[] = [
        '/**',
        '* description of test...',
        '*/',
        '// ' + signature,
        `TEST_F ( ${ className }Test, ${ nameToUse } )`,
        '{',
        '\t',
        '}',
        '',
      ];
      methodTestLines.push(...methodLines);
    });

    const footerLine = ['}'];

    const outText = [
      ...headerLines,
      ...(methodTestLines.map(line => '\t' + line)),
      ...footerLine,
    ].join('\n');
    console.log(outText);
    this.unitTests.fileText = outText;
  }
}
