const statusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

const errorMessages = {
  INVALID_REQUEST: 'Invalid request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  INVALID_EMAIL: 'Invalid email',
  INVALID_PASSWORD: 'Invalid password',
  DATABASE_ERROR: 'Database error',
  SOCIAL_LINK_EXISTS: 'Social link already exists',
  SOMETHING_WENT_WRONG: 'Something went wrong',
};

const gender = ['MALE', 'FEMALE', 'OTHER'] as const;

export { statusCodes, errorMessages, gender };
