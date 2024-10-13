export interface signupRequest {
  email: string;
  password: string;
  name: string;
}

export interface loginRequest {
  email: string;
  password: string;
}

export interface problemStructure {
  name: string;
  functionName: string;
  inputs: string[];
  output: any;
}

export interface exampleStructure {
  input: any;
  output: any;
}
