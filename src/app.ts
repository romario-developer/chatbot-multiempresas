import express from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { tenantRoutes } from './modules/tenants/tenant.routes';
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes';

const app = express();

app.use(express.json());

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/tenants', tenantRoutes);
app.use('/whatsapp', whatsappRoutes);

export { app };
