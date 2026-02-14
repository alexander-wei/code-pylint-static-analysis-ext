import { IssueIntf } from "#PylintWrapper/diagnostics";

/**
 * Adapt `pylint` buffered standard output lines to structured diagnostic
 * `Issue` objects.
 *
 * Mutable implementation of the Issue adapter and diagnostic container.
 */
export default class IssueImpl implements IssueIntf {
  public readonly file: string;
  public readonly line: number;
  public readonly column: number;
  public readonly category: IssueIntf["category"];
  public readonly originalCategory?: string;
  public readonly code?: string;
  public readonly codeTag?: string;
  public message: string;
  public raw?: string;

  /**
   * Construct a diagnostic object.
   *
   * IssueImpl is mutable, notwithstanding certain critical elements being set as final
   * attributes. These are:
   * @param file
   * @param line
   * @param column
   * @param category
   * @param originalCategory
   * @param codeRest
   *
   * The other attributes,
   * @param message
   * @param raw
   *
   * are allowed to be updated, by "extending" an issue with its continuation (parsing a
   * consecutive line of the `pylint` standard output.)
   */
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
    const trimmed = (codeRest || "").trim();
    this.code = trimmed === "" ? undefined : trimmed;
    this.message = message;
    this.raw = raw;

    const matchCodeTag = this.message.match(/.*\(([^\(\)]*)\)$/);

    if (matchCodeTag && matchCodeTag[1]) {
      this.codeTag = matchCodeTag[1];
    }
  }

  /**
   * Convert a line (presumably from `pylint` standard output) into a structured diagnostic object.
   * @param {string} line - comes from `pylint` standard output
   * @param {RegExp} PATT - regular expression that matches 7 capturing groups corresp to diagnostic attributes
   * @param {RegExp} PATT_ALT - ibid
   * @returns {IssueImpl | null} new diagnostic object
   */
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

  /**
   * Extend a diagnostic object with continuation from a following consecutive line
   * presumably from the `pylint` standard output. Mutates this diagnostic object.
   * @param {string} line
   */
  public appendContinuation(line: string): void {
    this.message = `${this.message}\n${line.replace(/\n$/, "")}`;
    this.raw = (this.raw || "") + line;
  }

  /**
   * Serialize to json
   * @returns {IssueIntf} serialized diagnostic object
   */
  public toJSON(): IssueIntf {
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
