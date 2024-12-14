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

export interface MarkAsFinalRequest {
  pool_name: string;
}
