interface signupRequest {
  email: string;
  password: string;
  fullname: string;
}

interface loginRequest {
  email: string;
  password: string;
}

interface AddProfileRequest {
  country?: string;
  gender?: string;
  location?: string;
  birthday?: string;
  bio?: string;
  skills?: string[];
}

export { signupRequest, loginRequest, AddProfileRequest };
