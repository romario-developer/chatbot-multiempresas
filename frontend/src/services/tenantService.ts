import { api } from './api';
import { Tenant } from '../types';

async function listTenants(): Promise<Tenant[]> {
  const res = await api.get('/tenants');
  return res.data.tenants;
}

async function createTenant(payload: { name: string; slug?: string }) {
  const res = await api.post('/tenants', payload);
  return res.data.tenant as Tenant;
}

export const tenantService = {
  listTenants,
  createTenant,
};
