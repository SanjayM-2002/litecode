import { Request, Response } from 'express';
import { statusCodes } from '../constants/constants';

const healthCheck = (req: Request, res: Response) => {
  res.status(statusCodes.OK).json({ status: 'success' });
};

export { healthCheck };
