import snakeCase from 'lodash.snakecase';

export type FileObject = {
  fileName: string;
  fileText: string;
}

interface MethodInfo {
  name: string;
  signature: string;
}

export type FilesInfoObject = {
  fixtureHeader: FileObject;
  fixtureSource: FileObject;
  unitTests: FileObject;
  methods: MethodInfo[];
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
  private methods: MethodInfo[] = [];

  constructor(private className: string, private fileText: string, private appGroup: string = "GeneratedTests") {
    // remove everything after "private"
    this.fileText = this.fileText.split('private:')[0];

    this.createInfoObjects();
    this.generateFixtureHeaderFile();
    this.generateFixtureSourceFile();
    this.generateUnitTests();
  }

  public getFileInfoObject(): FilesInfoObject {
    const { fixtureHeader, fixtureSource, unitTests } = this;
    return {
      fixtureHeader: { ...fixtureHeader },
      fixtureSource: { ...fixtureSource },
      unitTests: { ...unitTests },
      methods: JSON.parse(JSON.stringify(this.methods)),
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
    // console.log(JSON.stringify(methods, null, 2));
  }

  private generateUnitTests() {
    const { className, appGroup } = this;
    const headerLines = [
      `#include "../${ appGroup }/${ className }Test.h"`,
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
      const methodsWithThisName = this.methods.filter(m => m.name === name);
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

    this.unitTests.fileText = [
      ...headerLines,
      ...(methodTestLines.map(line => '\t' + line)),
      ...footerLine,
    ].join('\n');
  }

  private generateFixtureHeaderFile() {
    const header = snakeCase(this.className).toUpperCase() + "_H";
    const testName = this.className + "Test";
    this.fixtureHeader.fileText = `#ifndef ${ header }
#define ${ header }

#include "gtest/gtest.h"

namespace Test
{
  class ${ testName } : public testing::Test
  {
  public:
    ${ testName }();

    virtual ~${ testName }();

  protected:
    virtual void SetUp() override;
    virtual void TearDown() override;
  };
}

#endif //${ header }
`;
  }

  private generateFixtureSourceFile() {
    const { className } = this;
    const testName = this.className + "Test";

    this.fixtureSource.fileText = `#include "${ className }Test.h"

namespace Test
{
  
  ${ testName }::${ testName }() {
  
  }
  
  ${ testName }::~${ testName }() {
  
  }
      
  void ${ testName }::SetUp() {
  
  }
     
  void ${ testName }::TearDown() {
  
  } 
}   
`;
  }
}
