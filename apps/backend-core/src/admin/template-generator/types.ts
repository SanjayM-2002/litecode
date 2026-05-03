export interface Argument {
  name: string;
  type: string;
}

export interface Signature {
  methodName: string;
  args: Argument[];
  returnType: string;
}

export interface GeneratedTemplate {
  starterCode: string;
  driverCode: string;
}