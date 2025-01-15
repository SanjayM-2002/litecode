import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { statusCodes, errorMessages } from '../constants/constants';
import { handleError } from '../utils/error.util';
import {
  addProfileSchema,
  updateProfileSchema,
  addEducationSchema,
  updateEducationSchema,
  addWorkExpSchema,
  updateWorkExpSchema,
  addSocialLinkSchema,
  updateSocialLinkSchema,
} from '../validations/profile.validation';

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

const getProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.body.token.id as string;
    const profile = await prisma.profile.findUnique({
      where: {
        userId,
      },
      select: {
        id: true,
        country: true,
        gender: true,
        location: true,
        birthday: true,
        bio: true,
        skills: true,
        education: true,
        socialLinks: true,
        workExperience: true,
      },
    });
    return res.status(statusCodes.OK).json({ profile });
  } catch (error) {
    console.error('Error in getProfile: ', error);
    handleError(error, res);
  }
};

const updateProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    const inputData = { profileId: req.params.profileId, ...req.body };
    const { error, value: body } = updateProfileSchema.validate(inputData, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const profile = await prisma.profile.update({
      where: {
        id: body.profileId,
      },
      data: {
        country: body.country,
        gender: body.gender,
        location: body.location,
        birthday: body.birthday ? new Date(body.birthday) : null,
        bio: body.bio,
        skills: body.skills,
      },
    });
    return res.status(statusCodes.OK).json({ profile });
  } catch (error) {
    console.error('Error in updateProfile: ', error);
    handleError(error, res);
  }
};

const addEducation = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = addEducationSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const education = await prisma.education.create({
      data: {
        profileId: body.profileId,
        institute: body.institute,
        degree: body.degree,
        subject: body.subject,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return res.status(statusCodes.CREATED).json({ education });
  } catch (error) {
    console.error('Error in addEducation: ', error);
    handleError(error, res);
  }
};

const updateEducation = async (req: Request, res: Response): Promise<any> => {
  try {
    const inputData = { educationId: req.params.educationId, ...req.body };
    const { error, value: body } = updateEducationSchema.validate(inputData, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const education = await prisma.education.update({
      where: {
        id: body.educationId,
      },
      data: {
        institute: body.institute,
        degree: body.degree,
        subject: body.subject,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return res.status(statusCodes.OK).json({ education });
  } catch (error) {
    console.error('Error in updateEducation: ', error);
    handleError(error, res);
  }
};

const addWorkExp = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = addWorkExpSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const workExperience = await prisma.workExperience.create({
      data: {
        profileId: body.profileId,
        company: body.company,
        role: body.role,
        location: body.location,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return res.status(statusCodes.CREATED).json({ workExperience });
  } catch (error) {
    console.error('Error in addWorkExp: ', error);
    handleError(error, res);
  }
};

const updateWorkExp = async (req: Request, res: Response): Promise<any> => {
  try {
    const inputData = { workExpId: req.params.workExpId, ...req.body };
    const { error, value: body } = updateWorkExpSchema.validate(inputData, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const workExperience = await prisma.workExperience.update({
      where: {
        id: body.workExpId,
      },
      data: {
        company: body.company,
        role: body.role,
        location: body.location,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      },
    });
    return res.status(statusCodes.OK).json({ workExperience });
  } catch (error) {
    console.error('Error in updateWorkExp: ', error);
    handleError(error, res);
  }
};

const addSocialLink = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = addSocialLinkSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const existingSocialLink = await prisma.socialLinks.findUnique({
      where: { profileId: body.profileId },
    });
    if (existingSocialLink) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.SOCIAL_LINK_EXISTS });
    }
    const socialLink = await prisma.socialLinks.create({
      data: {
        profileId: body.profileId,
        instagram: body.instagram,
        github: body.github,
        twitter: body.twitter,
        linkedin: body.linkedin,
        personalWebsite: body.personalWebsite,
        other: body.other,
      },
    });
    return res.status(statusCodes.CREATED).json({ socialLink });
  } catch (error) {
    console.error('Error in addSocialLink: ', error);
    handleError(error, res);
  }
};

const updateSocialLink = async (req: Request, res: Response): Promise<any> => {
  try {
    const inputData = { socialLinksId: req.params.socialLinksId, ...req.body };
    const { error, value: body } = updateSocialLinkSchema.validate(inputData, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const socialLink = await prisma.socialLinks.update({
      where: {
        id: body.socialLinksId,
      },
      data: {
        instagram: body.instagram,
        github: body.github,
        twitter: body.twitter,
        linkedin: body.linkedin,
        personalWebsite: body.personalWebsite,
        other: body.other,
      },
    });
    return res.status(statusCodes.OK).json({ socialLink });
  } catch (error) {
    console.error('Error in updateSocialLink: ', error);
    handleError(error, res);
  }
};

export {
  addProfile,
  getProfile,
  updateProfile,
  addEducation,
  updateEducation,
  addWorkExp,
  updateWorkExp,
  addSocialLink,
  updateSocialLink,
};
