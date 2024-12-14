export interface UserData {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  addr?: string | null;
  social_id?: string | null;
  profile_pick?: string | null;
  pool_list: string[];
}
