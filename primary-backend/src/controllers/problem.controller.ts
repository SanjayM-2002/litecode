import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { statusCodes, errorMessages } from '../constants/constants';
import { handleError } from '../utils/error.util';
import { addProblemSchema } from '../validations/problem.validation';

const prisma = new PrismaClient();

const addProblem = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = addProblemSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
  } catch (error) {
    console.error('Error in addProblem: ', error);
    handleError(error, res);
  }
};

export { addProblem };
