export interface Commercial {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialAccessToken {
  id: string;
  token: string;
  commercial_name: string;
  commercial_email: string;
  statement_id?: string;  // ID del extracto bancario asociado
  expires_at: string;
  created_at: string;
  used: boolean;
}

export interface CommercialNotification {
  id: string;
  commercial_id: string;
  statement_id: string;
  token_id: string;
  sent_at: string;
  status: boolean; // true = enviado correctamente, false = error
  error_message?: string;
  commercial?: {
    name: string;
    email: string;
  };
}
