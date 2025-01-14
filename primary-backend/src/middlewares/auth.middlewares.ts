import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { statusCodes, errorMessages } from '../constants/constants';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  (async () => {
    try {
      const token = req.cookies.jwt;

      if (!token) {
        res
          .status(statusCodes.FORBIDDEN)
          .json({ error: errorMessages.UNAUTHORIZED });
        return;
      }

      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as jwt.JwtPayload;

      if (!decodedToken || (decodedToken && !decodedToken.id)) {
        return res
          .status(statusCodes.FORBIDDEN)
          .json({ error: errorMessages.UNAUTHORIZED });
      }
      const userId = decodedToken.id;
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
          role: 'ADMIN',
        },
        select: {
          id: true,
          email: true,
          fullname: true,
        },
      });
      if (!user) {
        return res
          .status(statusCodes.FORBIDDEN)
          .json({ error: errorMessages.UNAUTHORIZED });
      }
      req.body.token = user;
      next();
    } catch (err) {
      res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
      console.log('Error in auth middleware', err.message);
    }
  })();
};

const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  (async () => {
    try {
      const token = req.cookies.jwt;

      if (!token) {
        res
          .status(statusCodes.FORBIDDEN)
          .json({ error: errorMessages.UNAUTHORIZED });
        return;
      }

      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as jwt.JwtPayload;

      if (!decodedToken || (decodedToken && !decodedToken.id)) {
        return res
          .status(statusCodes.FORBIDDEN)
          .json({ error: errorMessages.UNAUTHORIZED });
      }
      const userId = decodedToken.id;
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
          role: 'PARTICIPANT',
        },
        select: {
          id: true,
          email: true,
          fullname: true,
        },
      });
      if (!user) {
        return res
          .status(statusCodes.FORBIDDEN)
          .json({ error: errorMessages.UNAUTHORIZED });
      }
      req.body.token = user;
      next();
    } catch (err) {
      res
        .status(statusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: errorMessages.INTERNAL_SERVER_ERROR });
      console.log('Error in auth middleware', err.message);
    }
  })();
};

export { adminMiddleware, userMiddleware };
