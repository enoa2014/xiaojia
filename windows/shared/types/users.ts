export type UserStatus = 'pending' | 'active' | 'rejected' | 'inactive' | 'unknown';

export type UserRelativeRelation = 'father' | 'mother' | 'guardian' | 'other';

export interface UserRelativeInfo {
  patientName: string | null;
  relation: UserRelativeRelation | null;
  patientIdCardMasked: string | null;
}

export interface UserProfile {
  id: string;
  openId: string;
  status: UserStatus;
  role: string | null;
  roles: string[];
  name: string | null;
  nickname: string | null;
  loginName: string | null;
  phone: string | null;
  phoneMasked: string | null;
  idCardMasked: string | null;
  applyRole: 'volunteer' | 'parent' | null;
  relative: UserRelativeInfo | null;
  rejectReason: string | null;
  avatar: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  isTest: boolean;
}

export interface UserRegisterResult {
  status: 'pending' | 'active' | 'rejected';
}

export interface UserLoginResult {
  user: UserProfile;
}
