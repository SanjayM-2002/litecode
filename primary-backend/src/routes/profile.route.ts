import express, { Request, Response } from 'express';
import {
  addProfile,
  getProfile,
  updateProfile,
  addEducation,
  updateEducation,
  addWorkExp,
  updateWorkExp,
  addSocialLink,
  updateSocialLink,
} from '../controllers/profile.controller';
import { userMiddleware } from '../middlewares/auth.middlewares';
const router = express.Router();

// profile routes
router.get('/get-profile', userMiddleware, getProfile);
router.post('/add-profile', userMiddleware, addProfile);
router.put('/update-profile/:profileId', userMiddleware, updateProfile);

// education routes
router.post('/add-education', userMiddleware, addEducation);
router.put('/update-education/:educationId', userMiddleware, updateEducation);

// work experience routes
router.post('/add-work-experience', userMiddleware, addWorkExp);
router.put('/update-work-experience/:workExpId', userMiddleware, updateWorkExp);

// social links routes
router.post('/add-social-link', userMiddleware, addSocialLink);
router.put(
  '/update-social-link/:socialLinksId',
  userMiddleware,
  updateSocialLink
);
export { router };
