import { Response } from 'express';
import { prisma } from '../../shared/prisma';
import { AuthRequest } from '../../shared/middlewares/auth';

export async function createTenant(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, slug } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Tenant name is required' });
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      users: {
        create: {
          userId,
          role: 'owner',
        },
      },
    },
  });

  return res.status(201).json({ tenant });
}

export async function listTenants(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const memberships = await prisma.userTenantRole.findMany({
    where: { userId },
    include: { tenant: true },
  });

  const tenants = memberships.map((m) => ({
    id: m.tenant.id,
    name: m.tenant.name,
    slug: m.tenant.slug,
    role: m.role,
  }));

  return res.json({ tenants });
}
