import Joi from 'joi';
import { gender } from '../constants/constants';

const addProfileSchema = Joi.object({
  country: Joi.string().max(50).optional().messages({
    'string.max': 'Country must be less than 50 characters',
  }),
  gender: Joi.string()
    .valid(...gender)
    .optional()
    .messages({
      'any.only': `Gender must be one of: ${gender.join(', ')}`,
    }),
  location: Joi.string().max(50).optional().messages({
    'string.max': 'Location must be less than 50 characters',
  }),
  birthday: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Birthday must be a valid ISO date string',
  }),
  bio: Joi.string().max(150).optional().messages({
    'string.max': 'Bio must be less than 150 characters',
  }),
  skills: Joi.array().items(Joi.string()).max(10).optional().messages({
    'array.max': 'Skills must have a maximum of 10 items',
  }),
});

export { addProfileSchema };
