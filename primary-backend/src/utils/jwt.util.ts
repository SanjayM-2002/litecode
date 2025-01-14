import jwt from 'jsonwebtoken';
import { Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (id: string, res: Response): string => {
  const payload = { id };
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '5d',
  });
  res.cookie('jwt', token, {
    httpOnly: true,
    maxAge: 5 * 24 * 60 * 60 * 1000,
    sameSite: 'strict',
  });
  return token;
};

export { generateToken };
