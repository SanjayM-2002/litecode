interface signupRequest {
  email: string;
  password: string;
  fullname: string;
}

interface loginRequest {
  email: string;
  password: string;
}

export { signupRequest, loginRequest };
