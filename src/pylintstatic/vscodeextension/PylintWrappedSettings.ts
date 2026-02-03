type PylintWrappedSettings = {
  pylintPath: string;
  usePythonModule: boolean;
  enableAll: boolean;
  recursive: boolean;
  extraArgs: string[];
};

export default PylintWrappedSettings;
