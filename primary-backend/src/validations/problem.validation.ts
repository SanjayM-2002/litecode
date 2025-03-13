import Joi, { any } from 'joi';
import { difficulty } from '../constants/constants';
import { title } from 'process';

const addProblemSchema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': 'Title is required',
    'string.empty': 'Title is required',
  }),
  description: Joi.string().required().messages({
    'any.required': 'Description is required',
    'string.empty': 'Description is required',
  }),
  companies: Joi.array().items(Joi.string().uuid()),
  topics: Joi.array().items(Joi.string().uuid()),
  difficulty: Joi.string()
    .valid(...Object.values(difficulty))
    .required()
    .messages({
      'any.required': 'Difficulty is required',
      'string.empty': 'Difficulty is required',
      'any.only': 'Difficulty must be EASY, MEDIUM, or HARD',
    }),
  problemImage: Joi.object({
    url: Joi.string(),
    description: Joi.string(),
  }),
  testCases: Joi.array().items(
    Joi.object({
      inputs: Joi.array(),
      output: Joi.object(),
    })
  ),
  token: Joi.object().required().messages({
    'any.required': 'Token is required',
  }),
});

export { addProblemSchema };
