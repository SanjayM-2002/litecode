import express from 'express';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { router as authRouter } from './routes/auth.route';
import { router as profileRouter } from './routes/profile.route';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { healthCheck } from './controllers/health.controller';

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/api/v1/health', healthCheck);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user/profile', profileRouter);

app.listen(PORT, () => {
  console.log(`Application is listening on http://localhost:${PORT}/`);
});
