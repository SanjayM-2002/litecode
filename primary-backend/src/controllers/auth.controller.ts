import { Request, Response } from 'express';
import { signupRequest, loginRequest } from '../constants/types';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.util';
import { statusCodes, errorMessages } from '../constants/constants';

const prisma = new PrismaClient();

const signup = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: signupRequest = req.body;
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
    res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
  }
};

const signupAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: signupRequest = req.body;
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
    res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
  }
};

const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: loginRequest = req.body;
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
    res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
  }
};

const loginAdmin = async (req: Request, res: Response): Promise<any> => {
  try {
    const body: loginRequest = req.body;
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
    res
      .status(statusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
  }
};

export { signup, login, signupAdmin, loginAdmin };
