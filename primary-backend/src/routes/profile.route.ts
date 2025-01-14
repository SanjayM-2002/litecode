import express, { Request, Response } from 'express';
import { addProfile } from '../controllers/profile.controller';
import { userMiddleware } from '../middlewares/auth.middlewares';
const router = express.Router();

router.post('/add-profile', userMiddleware, addProfile);

export { router };
