import express, { Request, Response } from 'express';
import {
  signup,
  login,
  signupAdmin,
  loginAdmin,
} from '../controllers/auth.controller';
const router = express.Router();

router.post('/user/signup', signup);
router.post('/user/login', login);
router.post('/admin/signup', signupAdmin);
router.post('/admin/login', loginAdmin);

export { router };
