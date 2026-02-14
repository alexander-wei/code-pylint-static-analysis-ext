import { IssueIntf } from "#PylintWrapper/diagnostics";

type ReporterIntf = (params: { uri: string; issues: IssueIntf[] }) => void;
export default ReporterIntf;
