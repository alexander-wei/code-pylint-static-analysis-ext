import IssueIntf from "../../diagnostics/IssueIntf";

export default class IssueImpl implements IssueIntf {
  public readonly file: string;
  public readonly line: number;
  public readonly column: number;
  public readonly category: IssueIntf["category"];
  public readonly originalCategory?: string;
  public readonly code?: string;
  public codeTag?: string;
  public message: string;
  public raw?: string;
  private readonly _codeRest: string;

  private constructor(
    file: string,
    line: number,
    column: number,
    category: IssueIntf["category"],
    originalCategory: string,
    codeRest: string,
    message: string,
    raw?: string,
  ) {
    this.file = file;
    this.line = line;
    this.column = column;
    this.category = category;
    this.originalCategory = originalCategory; // [EWCRI] -> {error, warning, convention, refactor, information}
    this._codeRest = codeRest || "";
    const trimmed = (codeRest || "").trim();
    this.code = trimmed === "" ? undefined : trimmed;
    this.message = message;
    this.raw = raw;

    const matchCodeTag = this.message.match(/.*\(([^\(\)]*)\)$/);

    if (matchCodeTag && matchCodeTag[1]) {
      this.codeTag = matchCodeTag[1];
      // process.stdout.write(matchCodeTag);
      matchCodeTag.forEach((element) => {
        // process.stdout.write(element);
      });
    }
  }

  public static fromLine(
    line: string,
    PATT: RegExp,
    PATT_ALT: RegExp,
  ): IssueImpl | null {
    const clean = line.replace(/\n$/, "");
    let m = clean.match(PATT);
    if (m) {
      const file = m[1];
      const lineNo = Number(m[2]);
      const col = Number(m[3]);
      let cat = m[4];
      let origCat = m[4];
      const codeRest = m[5] || "";
      const msg = m[6];
      if (cat === "R" || cat === "C") {
        cat = "I";
      }
      return new IssueImpl(
        file,
        lineNo,
        col,
        cat as IssueIntf["category"],
        origCat,
        codeRest,
        msg,
        line,
      );
    }
    m = clean.match(PATT_ALT);
    if (m) {
      const file = m[1];
      const lineNo = Number(m[2]);
      const code = m[3];
      const msg = m[4] || "";
      let cat = code[0];
      let origCat = code[0];
      if (cat === "R" || cat === "C") {
        cat = "I";
      }
      return new IssueImpl(
        file,
        lineNo,
        0,
        cat as IssueIntf["category"],
        origCat,
        ` ${code}`,
        msg,
        line,
      );
    }
    return null;
  }

  public appendContinuation(line: string): void {
    this.message = `${this.message}\n${line.replace(/\n$/, "")}`;
    this.raw = (this.raw || "") + line;
  }

  public toJSON(): IssueIntf {
    const matchCodeTag = this.message.match(/.*\(([^\(\)]*)\)$/);

    if (matchCodeTag && matchCodeTag[1]) {
      this.codeTag = matchCodeTag[1];
      // process.stdout.write(matchCodeTag);
      matchCodeTag.forEach((element) => {
        // process.stdout.write(element);
      });
    }
    return {
      file: this.file,
      line: this.line,
      column: this.column,
      category: this.category,
      originalCategory: this.originalCategory,
      code: this.code,
      codeTag: this.codeTag,
      message: this.message,
      raw: this.raw,
    };
  }
}
