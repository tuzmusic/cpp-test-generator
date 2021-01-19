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
  private methods: MethodInfo[];

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
      const functionSignature = /\*\/\n\W*(.*)/;
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
    console.log(JSON.stringify(methods));
    console.log("let's see!");

  }

  private generateUnitTests() {

    this.parseMethods();
    /*
    * locate methods:
    * next line after end of doxygen, after "@return"
    *
    * if not inline, simply ends with ");"
    *
    * if inline,
    * ends with ")"
    * followed by "{"
    * */

    /*
    * the name of the method:
    * before "(" or " ("
    * the single word (i.e., string of WORD characters)
    * */

    // this gets from the line with "@return"
    // to the end of the method declaration:
    const returnDocToEndOfDeclaration = /\* @return.[^]*?\)/;

    // from that one above, this gets the function signature
    const functionSignature = /\*\/\n\W*(.*)/;

    // from that one above, this gets the name of the method
    // it also includes an optional leading tilde for destructors
    const dataNameFromDeclLines = /(~?\w*)\s?\(/;
  }
}
