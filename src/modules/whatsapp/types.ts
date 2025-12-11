export type MetaOAuthState = {
  tenantId: string;
  userId: string;
};

export type MetaAccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id?: string;
};

export type Business = {
  id: string;
  name?: string;
};

export type PhoneNumberInfo = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  capabilities?: any;
};

export type WhatsAppWebhookPayload = {
  object: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: {
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        messages?: any[];
        statuses?: any[];
      };
      field?: string;
    }>;
  }>;
};
