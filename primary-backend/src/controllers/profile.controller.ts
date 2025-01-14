import { Request, Response } from 'express';
import { AddProfileRequest } from '../constants/types';
import { PrismaClient } from '@prisma/client';
import { statusCodes, errorMessages } from '../constants/constants';

const prisma = new PrismaClient();

const addProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: AddProfileRequest = req.body;
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
  } catch (err) {
    console.error('Error in addProfile: ', err);
    res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
  }
};

export { addProfile };
