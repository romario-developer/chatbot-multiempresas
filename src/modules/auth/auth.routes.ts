import { Router } from 'express';
import { register, login, me } from './auth.controller';
import { authMiddleware } from '../../shared/middlewares/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export const authRoutes = router;
