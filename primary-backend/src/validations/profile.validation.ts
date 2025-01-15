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
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const updateProfileSchema = Joi.object({
  profileId: Joi.string().uuid().required().messages({
    'string.uuid': 'Profile ID must be a valid UUID',
    'any.required': 'Profile ID is required',
  }),
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
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const addEducationSchema = Joi.object({
  profileId: Joi.string().uuid().required().messages({
    'string.uuid': 'Profile ID must be a valid UUID',
    'any.required': 'Profile ID is required',
  }),
  institute: Joi.string().max(50).required().messages({
    'string.max': 'institute must be less than 50 characters',
    'any.required': 'institute is required',
  }),
  degree: Joi.string().max(50).required().messages({
    'string.max': 'degree must be less than 50 characters',
    'any.required': 'degree is required',
  }),
  subject: Joi.string().max(50).required().messages({
    'string.max': 'subject must be less than 50 characters',
    'any.required': 'subject is required',
  }),
  startDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'startDate must be a valid ISO date string',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'endDate must be a valid ISO date string',
  }),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const updateEducationSchema = Joi.object({
  educationId: Joi.string().uuid().required().messages({
    'string.uuid': 'Profile ID must be a valid UUID',
    'any.required': 'Profile ID is required',
  }),
  institute: Joi.string().max(50).required().messages({
    'string.max': 'institute must be less than 50 characters',
    'any.required': 'institute is required',
  }),
  degree: Joi.string().max(50).required().messages({
    'string.max': 'degree must be less than 50 characters',
    'any.required': 'degree is required',
  }),
  subject: Joi.string().max(50).required().messages({
    'string.max': 'subject must be less than 50 characters',
    'any.required': 'subject is required',
  }),
  startDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'startDate must be a valid ISO date string',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'endDate must be a valid ISO date string',
  }),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const addWorkExpSchema = Joi.object({
  profileId: Joi.string().uuid().required().messages({
    'string.uuid': 'Profile ID must be a valid UUID',
    'any.required': 'Profile ID is required',
  }),
  company: Joi.string().max(50).required().messages({
    'string.max': 'company must be less than 50 characters',
    'any.required': 'company is required',
  }),
  role: Joi.string().max(50).required().messages({
    'string.max': 'role must be less than 50 characters',
    'any.required': 'role is required',
  }),
  location: Joi.string().max(50).required().messages({
    'string.max': 'location must be less than 50 characters',
    'any.required': 'location is required',
  }),
  startDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'startDate must be a valid ISO date string',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'endDate must be a valid ISO date string',
  }),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const updateWorkExpSchema = Joi.object({
  workExpId: Joi.string().uuid().required().messages({
    'string.uuid': 'Profile ID must be a valid UUID',
    'any.required': 'Profile ID is required',
  }),
  company: Joi.string().max(50).required().messages({
    'string.max': 'company must be less than 50 characters',
    'any.required': 'company is required',
  }),
  role: Joi.string().max(50).required().messages({
    'string.max': 'role must be less than 50 characters',
    'any.required': 'role is required',
  }),
  location: Joi.string().max(50).required().messages({
    'string.max': 'location must be less than 50 characters',
    'any.required': 'location is required',
  }),
  startDate: Joi.string().isoDate().required().messages({
    'string.isoDate': 'startDate must be a valid ISO date string',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'endDate must be a valid ISO date string',
  }),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const addSocialLinkSchema = Joi.object({
  profileId: Joi.string().uuid().required().messages({
    'string.uuid': 'Profile ID must be a valid UUID',
    'any.required': 'Profile ID is required',
  }),
  instagram: Joi.string().max(50).messages({
    'string.max': 'instagram must be less than 50 characters',
  }),
  github: Joi.string().max(50).messages({
    'string.max': 'github must be less than 50 characters',
  }),
  twitter: Joi.string().max(50).messages({
    'string.max': 'twitter must be less than 50 characters',
  }),
  linkedin: Joi.string().max(50).messages({
    'string.max': 'linkedin must be less than 50 characters',
  }),
  personalWebsite: Joi.string().max(50).messages({
    'string.max': 'personalWebsite must be less than 50 characters',
  }),
  other: Joi.string().max(50).messages({
    'string.max': 'other must be less than 50 characters',
  }),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

const updateSocialLinkSchema = Joi.object({
  socialLinksId: Joi.string().uuid().required().messages({
    'string.uuid': 'socialLinksId must be a valid UUID',
    'any.required': 'socialLinksId is required',
  }),
  instagram: Joi.string().max(50).messages({
    'string.max': 'instagram must be less than 50 characters',
  }),
  github: Joi.string().max(50).messages({
    'string.max': 'github must be less than 50 characters',
  }),
  twitter: Joi.string().max(50).messages({
    'string.max': 'twitter must be less than 50 characters',
  }),
  linkedin: Joi.string().max(50).messages({
    'string.max': 'linkedin must be less than 50 characters',
  }),
  personalWebsite: Joi.string().max(50).messages({
    'string.max': 'personalWebsite must be less than 50 characters',
  }),
  other: Joi.string().max(50).messages({
    'string.max': 'other must be less than 50 characters',
  }),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

export {
  addProfileSchema,
  updateProfileSchema,
  addEducationSchema,
  updateEducationSchema,
  addWorkExpSchema,
  updateWorkExpSchema,
  addSocialLinkSchema,
  updateSocialLinkSchema,
};
