import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { statusCodes, errorMessages } from '../constants/constants';

export const handleError = (error: any, res: Response) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(statusCodes.BAD_REQUEST).json({
        error: errorMessages.DATABASE_ERROR,
      });
    }

    return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
      error: errorMessages.INTERNAL_SERVER_ERROR,
    });
  }

  console.error(error);
  return res.status(statusCodes.INTERNAL_SERVER_ERROR).json({
    error: errorMessages.INTERNAL_SERVER_ERROR,
  });
};
