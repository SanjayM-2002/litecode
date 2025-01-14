import express from 'express';
import { Request, Response } from 'express';
import dotenv from 'dotenv';
import { router as authRouter } from './routes/auth.route';
import cors from 'cors';
import { healthCheck } from './controllers/health.controller';

dotenv.config();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/v1/health', healthCheck);

app.use('/api/v1/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Application is listening on http://localhost:${PORT}/`);
});
