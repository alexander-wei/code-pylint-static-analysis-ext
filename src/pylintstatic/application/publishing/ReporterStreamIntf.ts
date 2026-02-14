import { IssueIntf } from "#PylintWrapper/diagnostics";

type ReporterStreamIntf = (params: {
  uri: string;
  issue: IssueIntf;
}) => void | Promise<void>;
export default ReporterStreamIntf;
