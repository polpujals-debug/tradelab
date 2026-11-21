import type { Database } from "./database.types";

type Public = Database["public"];
export type Row<T extends keyof Public["Tables"]> = Public["Tables"][T]["Row"];
export type Insert<T extends keyof Public["Tables"]> = Public["Tables"][T]["Insert"];
export type Update<T extends keyof Public["Tables"]> = Public["Tables"][T]["Update"];
export type ViewRow<T extends keyof Public["Views"]> = Public["Views"][T]["Row"];
export type Enum<T extends keyof Public["Enums"]> = Public["Enums"][T];

export type TradeStatus = Enum<"trade_status">;
export type TradeDirection = Enum<"trade_direction">;
export type MarketBias = Enum<"market_bias">;
export type MediaKind = Enum<"media_kind">;
export type TagKind = Enum<"tag_kind">;
