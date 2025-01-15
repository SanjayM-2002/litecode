import Joi from 'joi';

const signupSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Invalid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string().min(8).max(20).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must be less than 20 characters',
    'any.required': 'Password is required',
  }),
  fullname: Joi.string().min(1).required().messages({
    'string.min': 'Full name is required',
    'any.required': 'Full name is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      'string.email': 'Invalid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Invalid password',
    'any.required': 'Password is required',
  }),
});

export { signupSchema, loginSchema };
