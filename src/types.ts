export interface FileMeta {
  name: string;
  key: string;
  set: string;
  size: number;
  date: Date;
  mimeType: string;
  tags: string[];
}

export type AccessList = {
  email: string;
  role: string;
  "available sets": string;
};
