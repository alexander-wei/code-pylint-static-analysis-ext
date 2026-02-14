type HandleBufferCallableIntf = (
  chunk: Buffer,
  out: NodeJS.WritableStream,
) => void;

export default HandleBufferCallableIntf;
