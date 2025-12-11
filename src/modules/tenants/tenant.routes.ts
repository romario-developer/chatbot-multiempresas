import { Router } from 'express';
import { createTenant, listTenants } from './tenant.controller';
import { authMiddleware } from '../../shared/middlewares/auth';

const router = Router();

router.post('/', authMiddleware, createTenant);
router.get('/', authMiddleware, listTenants);

export const tenantRoutes = router;
