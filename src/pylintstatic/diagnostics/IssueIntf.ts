import Severity from "./Severity";

interface IssueIntf {
  file: string;
  line: number;
  column: number;
  category: Severity;
  // original single-letter category as reported by pylint (e.g. "E", "W", "C", "R", "I")
  originalCategory?: string;
  // message id / code (when available), e.g. "C0103"
  code?: string;
  codeTag?: string;
  message: string;
  // original raw line (including trailing newline when available)
  raw?: string;
}
export default IssueIntf;
