export type Tenant = {
  id: string;
  name: string;
  slug?: string | null;
};

export type WhatsAppIntegrationStatus = 'connected' | 'disconnected' | 'error' | 'unknown';

export type WhatsAppIntegration = {
  status: WhatsAppIntegrationStatus;
  phoneNumber?: string | null;
  businessName?: string | null;
};
