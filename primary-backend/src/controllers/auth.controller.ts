import { Request, Response } from 'express';
import { signupRequest, loginRequest } from '../constants/types';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { statusCodes, errorMessages } from '../constants/constants';
import { handleError } from '../utils/error.util';
import { signupSchema, loginSchema } from '../validations/auth.validation';

const prisma = new PrismaClient();

const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = signupSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const { email, password, fullname } = body;
    const isEmailPresent = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (isEmailPresent) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.EMAIL_ALREADY_EXISTS });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        fullname,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
      },
    });
    const token = generateToken(user.id, res);
    res.status(statusCodes.CREATED).json({ user, token });
  } catch (error) {
    console.error(error);
    handleError(error, res);
  }
};

const signupAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = signupSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const { email, password, fullname } = body;
    const isEmailPresent = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (isEmailPresent) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.EMAIL_ALREADY_EXISTS });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        fullname,
        password: hashedPassword,
        role: 'ADMIN',
      },
      select: {
        id: true,
        email: true,
        fullname: true,
      },
    });
    const token = generateToken(user.id, res);
    res.status(statusCodes.CREATED).json({ user, token });
  } catch (error) {
    console.error(error);
    handleError(error, res);
  }
};

const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = loginSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const { email, password } = body;
    const user = await prisma.user.findUnique({
      where: {
        email,
        role: 'PARTICIPANT',
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        password: true,
      },
    });
    if (!user) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.INVALID_EMAIL });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.INVALID_PASSWORD });
    }
    const token = generateToken(user.id, res);
    const { password: userPassword, ...userData } = user;
    res.status(statusCodes.OK).json({ user: userData, token });
  } catch (error) {
    console.error(error);
    handleError(error, res);
  }
};

const loginAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { error, value: body } = loginSchema.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      return res.status(statusCodes.BAD_REQUEST).json({ error: error.details });
    }
    const { email, password } = body;
    const user = await prisma.user.findUnique({
      where: {
        email,
        role: 'ADMIN',
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        password: true,
      },
    });
    if (!user) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.INVALID_EMAIL });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(statusCodes.BAD_REQUEST)
        .json({ error: errorMessages.INVALID_PASSWORD });
    }
    const token = generateToken(user.id, res);
    const { password: userPassword, ...userData } = user;
    res.status(statusCodes.OK).json({ user: userData, token });
  } catch (error) {
    console.error(error);
    handleError(error, res);
  }
};

export { signup, login, signupAdmin, loginAdmin };
