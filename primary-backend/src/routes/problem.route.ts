import express, { Request, Response } from 'express';
import {
  userMiddleware,
  adminMiddleware,
} from '../middlewares/auth.middlewares';
import { addProblem } from '../controllers/problem.controller';
const router = express.Router();

router.post('/add-problem', adminMiddleware, addProblem);

export { router };
