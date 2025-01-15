import { Request, Response } from 'express';
import { AddProfileRequest } from '../constants/types';
import { PrismaClient } from '@prisma/client';
import { statusCodes, errorMessages } from '../constants/constants';
import { handleError } from '../utils/error.util';
import { addProfileSchema } from '../validations/profile.validation';

const prisma = new PrismaClient();

const addProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = addProfileSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const userId = req.body.token.id as string;
    const newData = {
      userId,
      country: body.country,
      gender: body.gender,
      location: body.location,
      birthday: body.birthday ? new Date(body.birthday) : null,
      bio: body.bio,
      skills: body.skills,
    };
    const profile = await prisma.profile.create({
      data: newData,
    });
    return res.status(statusCodes.CREATED).json({ profile });
  } catch (error) {
    console.error('Error in addProfile: ', error);
    handleError(error, res);
  }
};

export { addProfile };
