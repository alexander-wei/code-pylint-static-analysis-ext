/**
 * The VsCode diagnostics interface accepts only three issue types: E/W/I.
 * These encode a severity, variable type.
 */
type Severity = "E" | "W" | "I";

export default Severity;
