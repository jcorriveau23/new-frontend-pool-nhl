import { Trade, Player, PoolSettings } from "./model";

export interface PoolCreationRequest {
  pool_name: string;
  number_pooler: number;
}

export interface PoolDeletionRequest {
  pool_name: string;
}

export interface AddPlayerRequest {
  pool_name: string;
  added_player_user_id: string;
  player: Player;
}

export interface RemovePlayerRequest {
  pool_name: string;
  removed_player_user_id: string;
  player_id: number;
}

/*
A pooler swapping a player they hold for an undrafted one. The two halves
travel together: free agency is a paired move, so a roster never changes size
and the swap costs exactly one unit of the drop budget.
*/
export interface DropAddPlayerRequest {
  pool_name: string;
  // The pooler the swap is for. A pooler sends their own id; the owner and the
  // assistants may send anyone's.
  participant_id: string;
  dropped_player_id: number;
  added_player: Player;
}

export interface CreateTradeRequest {
  pool_name: string;
  trade: Trade;
}

export interface DeleteTradeRequest {
  pool_name: string;
  trade_id: number;
}

export interface RespondTradeRequest {
  pool_name: string;
  trade_id: number;
  is_accepted: boolean;
}

export interface FillSpotRequest {
  pool_name: string;
  filled_spot_user_id: string;
  player_id: number;
}

export interface ModifyRosterRequest {
  pool_name: string;
  roster_modified_user_id: string;
  forw_list: number[];
  def_list: number[];
  goal_list: number[];
  reserv_list: number[];
}

export interface ProtectPlayersRequest {
  pool_name: string;
  forw_protected: number[];
  def_protected: number[];
  goal_protected: number[];
  reserv_protected: number[];
}

export interface UpdatePoolSettingsRequest {
  pool_name: string;
  pool_settings: PoolSettings;
}

export interface UpdatePoolerNameRequest {
  pool_name: string;
  pooler_user_id: string;
  new_name: string;
}

export interface MarkAsFinalRequest {
  pool_name: string;
}
