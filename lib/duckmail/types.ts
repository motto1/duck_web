export type DuckMailCollection<T> = {
  "hydra:member": T[];
  "hydra:totalItems": number;
  "hydra:view"?: {
    "@id": string;
    "@type": string;
    "hydra:first"?: string;
    "hydra:last"?: string;
    "hydra:next"?: string;
  };
};

export type DuckMailDomain = {
  id: string;
  domain: string;
  ownerId: string | null;
  isVerified: boolean;
  verificationToken: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DuckMailAccount = {
  id: string;
  address: string;
  authType: "email" | "token" | string;
  createdAt: string;
  updatedAt: string;
};

export type DuckMailTokenResponse = {
  id: string;
  token: string;
};

export type DuckMailAddress = {
  name: string;
  address: string;
};

export type DuckMailMessageSummary = {
  id: string;
  msgid: string;
  accountId: string;
  from: DuckMailAddress;
  to: DuckMailAddress[];
  subject: string;
  seen: boolean;
  isDeleted: boolean;
  hasAttachments: boolean;
  size: number;
  downloadUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type DuckMailAttachment = {
  id: string;
  filename: string;
  contentType: string;
  disposition: string;
  transferEncoding: string;
  related: boolean;
  size: number;
  downloadUrl: string;
};

export type DuckMailMessageDetail = DuckMailMessageSummary & {
  text?: string;
  html?: string[];
  attachments?: DuckMailAttachment[];
};

export type DuckMailSource = {
  id: string;
  downloadUrl: string;
  data: string;
};

export type DuckMailErrorPayload = {
  error?: string;
  message?: string;
};
