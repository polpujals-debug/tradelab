
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "accounts": {
                  Row: {
                    "created_at": string,"currency": string,"id": string,"initial_capital": number,"is_default": boolean,"name": string,"type": Database["public"]['Enums']["account_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"initial_capital": number,"is_default"?: boolean,"name": string,"type"?: Database["public"]['Enums']["account_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"id"?: string,"initial_capital"?: number,"is_default"?: boolean,"name"?: string,"type"?: Database["public"]['Enums']["account_type"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"analyses": {
                  Row: {
                    "analyzed_at": string,"asset_id": string,"bias": Database["public"]['Enums']["market_bias"],"content_md": string,"created_at": string,"id": string,"levels": NonNullable<Json>,"my_notes": string | null,"outcome": Database["public"]['Enums']["analysis_outcome"],"questions": string | null,"review_at": string | null,"reviewed_at": string | null,"scenario": string | null,"source": Database["public"]['Enums']["content_source"],"timeframes": (string)[],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analyzed_at"?: string,"asset_id": string,"bias"?: Database["public"]['Enums']["market_bias"],"content_md"?: string,"created_at"?: string,"id"?: string,"levels"?: NonNullable<Json>,"my_notes"?: string | null,"outcome"?: Database["public"]['Enums']["analysis_outcome"],"questions"?: string | null,"review_at"?: string | null,"reviewed_at"?: string | null,"scenario"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"timeframes"?: (string)[],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "analyzed_at"?: string,"asset_id"?: string,"bias"?: Database["public"]['Enums']["market_bias"],"content_md"?: string,"created_at"?: string,"id"?: string,"levels"?: NonNullable<Json>,"my_notes"?: string | null,"outcome"?: Database["public"]['Enums']["analysis_outcome"],"questions"?: string | null,"review_at"?: string | null,"reviewed_at"?: string | null,"scenario"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"timeframes"?: (string)[],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "analyses_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    }
                  ]
                },"api_keys": {
                  Row: {
                    "created_at": string,"id": string,"key_hash": string,"last_used_at": string | null,"name": string,"prefix": string,"revoked_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"key_hash": string,"last_used_at"?: string | null,"name": string,"prefix": string,"revoked_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"key_hash"?: string,"last_used_at"?: string | null,"name"?: string,"prefix"?: string,"revoked_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"assets": {
                  Row: {
                    "created_at": string,"id": string,"is_favorite": boolean,"symbol": string,"type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_favorite"?: boolean,"symbol": string,"type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_favorite"?: boolean,"symbol"?: string,"type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"concept_examples": {
                  Row: {
                    "analysis_id": string | null,"concept_id": string,"created_at": string,"id": string,"note": string | null,"trade_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id"?: string | null,"concept_id": string,"created_at"?: string,"id"?: string,"note"?: string | null,"trade_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "analysis_id"?: string | null,"concept_id"?: string,"created_at"?: string,"id"?: string,"note"?: string | null,"trade_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "concept_examples_analysis_id_fkey"
      columns: ["analysis_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concept_examples_concept_id_fkey"
      columns: ["concept_id"]
isOneToOne: false
      referencedRelation: "concepts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concept_examples_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "concept_examples_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "v_trade_metrics"
      referencedColumns: ["id"]
    }
                  ]
                },"concepts": {
                  Row: {
                    "category": string,"content_md": string,"created_at": string,"id": string,"slug": string,"sort_order": number,"status": Database["public"]['Enums']["concept_status"],"summary": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"content_md"?: string,"created_at"?: string,"id"?: string,"slug": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["concept_status"],"summary"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"content_md"?: string,"created_at"?: string,"id"?: string,"slug"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["concept_status"],"summary"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"goals": {
                  Row: {
                    "achieved_at": string | null,"created_at": string,"deadline": string | null,"id": string,"kind": Database["public"]['Enums']["goal_kind"],"manual_progress": number,"starts_on": string,"target": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achieved_at"?: string | null,"created_at"?: string,"deadline"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["goal_kind"],"manual_progress"?: number,"starts_on"?: string,"target": number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "achieved_at"?: string | null,"created_at"?: string,"deadline"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["goal_kind"],"manual_progress"?: number,"starts_on"?: string,"target"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"idempotency_keys": {
                  Row: {
                    "created_at": string,"key": string,"request_hash": string,"response": NonNullable<Json>,"scope": string,"status_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"key": string,"request_hash": string,"response": NonNullable<Json>,"scope": string,"status_code": number
                  }
                  Update: {
                    "created_at"?: string,"key"?: string,"request_hash"?: string,"response"?: NonNullable<Json>,"scope"?: string,"status_code"?: number
                  }
                  Relationships: [
                    
                  ]
                },"market_reports": {
                  Row: {
                    "btc_bias": Database["public"]['Enums']["market_bias"] | null,"content_md": string,"created_at": string,"eth_bias": Database["public"]['Enums']["market_bias"] | null,"id": string,"idempotency_key": string | null,"is_read": boolean,"report_date": string,"source": Database["public"]['Enums']["content_source"],"summary": string | null,"title": string,"type": Database["public"]['Enums']["report_type"],"updated_at": string,"watchlist": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "btc_bias"?: Database["public"]['Enums']["market_bias"] | null,"content_md": string,"created_at"?: string,"eth_bias"?: Database["public"]['Enums']["market_bias"] | null,"id"?: string,"idempotency_key"?: string | null,"is_read"?: boolean,"report_date": string,"source"?: Database["public"]['Enums']["content_source"],"summary"?: string | null,"title": string,"type": Database["public"]['Enums']["report_type"],"updated_at"?: string,"watchlist"?: (string)[]
                  }
                  Update: {
                    "btc_bias"?: Database["public"]['Enums']["market_bias"] | null,"content_md"?: string,"created_at"?: string,"eth_bias"?: Database["public"]['Enums']["market_bias"] | null,"id"?: string,"idempotency_key"?: string | null,"is_read"?: boolean,"report_date"?: string,"source"?: Database["public"]['Enums']["content_source"],"summary"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["report_type"],"updated_at"?: string,"watchlist"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"media": {
                  Row: {
                    "caption": string | null,"created_at": string,"entity_id": string | null,"entity_type": Database["public"]['Enums']["media_entity"] | null,"height": number | null,"id": string,"kind": Database["public"]['Enums']["media_kind"],"mime_type": string | null,"size_bytes": number | null,"sort_order": number,"storage_path": string | null,"thumb_url": string | null,"updated_at": string,"url": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: Database["public"]['Enums']["media_entity"] | null,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"mime_type"?: string | null,"size_bytes"?: number | null,"sort_order"?: number,"storage_path"?: string | null,"thumb_url"?: string | null,"updated_at"?: string,"url": string,"width"?: number | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: Database["public"]['Enums']["media_entity"] | null,"height"?: number | null,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"mime_type"?: string | null,"size_bytes"?: number | null,"sort_order"?: number,"storage_path"?: string | null,"thumb_url"?: string | null,"updated_at"?: string,"url"?: string,"width"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"practice_attempts": {
                  Row: {
                    "analysis_id": string | null,"answer_bias": Database["public"]['Enums']["market_bias"] | null,"answer_stop": number | null,"bias_correct": boolean | null,"created_at": string,"id": string,"trade_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysis_id"?: string | null,"answer_bias"?: Database["public"]['Enums']["market_bias"] | null,"answer_stop"?: number | null,"bias_correct"?: boolean | null,"created_at"?: string,"id"?: string,"trade_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "analysis_id"?: string | null,"answer_bias"?: Database["public"]['Enums']["market_bias"] | null,"answer_stop"?: number | null,"bias_correct"?: boolean | null,"created_at"?: string,"id"?: string,"trade_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "practice_attempts_analysis_id_fkey"
      columns: ["analysis_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "practice_attempts_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "practice_attempts_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "v_trade_metrics"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "created_at": string,"currency": string,"default_account_id": string | null,"default_risk_pct": number,"id": number,"locale": string,"max_daily_loss": number | null,"max_trades_per_day": number | null,"max_weekly_loss": number | null,"risk_warning_pct": number,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: string,"default_account_id"?: string | null,"default_risk_pct"?: number,"id"?: number,"locale"?: string,"max_daily_loss"?: number | null,"max_trades_per_day"?: number | null,"max_weekly_loss"?: number | null,"risk_warning_pct"?: number,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: string,"default_account_id"?: string | null,"default_risk_pct"?: number,"id"?: number,"locale"?: string,"max_daily_loss"?: number | null,"max_trades_per_day"?: number | null,"max_weekly_loss"?: number | null,"risk_warning_pct"?: number,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_default_account_id_fkey"
      columns: ["default_account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "settings_default_account_id_fkey"
      columns: ["default_account_id"]
isOneToOne: false
      referencedRelation: "v_account_balance"
      referencedColumns: ["account_id"]
    }
                  ]
                },"strategies": {
                  Row: {
                    "created_at": string,"description_md": string,"id": string,"indicators": (string)[],"is_active": boolean,"name": string,"timeframes": NonNullable<Json>,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description_md"?: string,"id"?: string,"indicators"?: (string)[],"is_active"?: boolean,"name": string,"timeframes"?: NonNullable<Json>,"updated_at"?: string,"version": number
                  }
                  Update: {
                    "created_at"?: string,"description_md"?: string,"id"?: string,"indicators"?: (string)[],"is_active"?: boolean,"name"?: string,"timeframes"?: NonNullable<Json>,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"strategy_rules": {
                  Row: {
                    "created_at": string,"id": string,"is_required": boolean,"sort_order": number,"strategy_id": string,"text": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_required"?: boolean,"sort_order"?: number,"strategy_id": string,"text": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_required"?: boolean,"sort_order"?: number,"strategy_id"?: string,"text"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "strategy_rules_strategy_id_fkey"
      columns: ["strategy_id"]
isOneToOne: false
      referencedRelation: "strategies"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "color": string | null,"created_at": string,"id": string,"kind": Database["public"]['Enums']["tag_kind"],"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["tag_kind"],"name": string,"updated_at"?: string
                  }
                  Update: {
                    "color"?: string | null,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["tag_kind"],"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"trade_rule_checks": {
                  Row: {
                    "created_at": string,"passed": boolean,"rule_id": string,"trade_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"passed"?: boolean,"rule_id": string,"trade_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"passed"?: boolean,"rule_id"?: string,"trade_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trade_rule_checks_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "strategy_rules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_rule_checks_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "v_rule_stats"
      referencedColumns: ["rule_id"]
    },{
      foreignKeyName: "trade_rule_checks_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_rule_checks_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "v_trade_metrics"
      referencedColumns: ["id"]
    }
                  ]
                },"trade_tags": {
                  Row: {
                    "created_at": string,"tag_id": string,"trade_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"tag_id": string,"trade_id": string
                  }
                  Update: {
                    "created_at"?: string,"tag_id"?: string,"trade_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trade_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "v_tag_stats"
      referencedColumns: ["tag_id"]
    },{
      foreignKeyName: "trade_tags_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trade_tags_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "v_trade_metrics"
      referencedColumns: ["id"]
    }
                  ]
                },"trades": {
                  Row: {
                    "account_id": string,"analysis_id": string | null,"asset_id": string,"bias_1h": Database["public"]['Enums']["market_bias"] | null,"capital_at_entry": number,"confirmation_5m": string | null,"created_at": string,"direction": Database["public"]['Enums']["trade_direction"],"emotion_after": string | null,"emotion_before": string | null,"entry_at": string | null,"entry_price": number,"exit_at": string | null,"exit_price": number | null,"fees": number,"id": string,"lesson": string | null,"leverage": number,"notes": string | null,"quantity": number,"setup": string | null,"source": Database["public"]['Enums']["content_source"],"status": Database["public"]['Enums']["trade_status"],"stop_loss": number,"strategy_id": string | null,"take_profit": number | null,"trigger_1m": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"analysis_id"?: string | null,"asset_id": string,"bias_1h"?: Database["public"]['Enums']["market_bias"] | null,"capital_at_entry": number,"confirmation_5m"?: string | null,"created_at"?: string,"direction": Database["public"]['Enums']["trade_direction"],"emotion_after"?: string | null,"emotion_before"?: string | null,"entry_at"?: string | null,"entry_price": number,"exit_at"?: string | null,"exit_price"?: number | null,"fees"?: number,"id"?: string,"lesson"?: string | null,"leverage"?: number,"notes"?: string | null,"quantity": number,"setup"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"status"?: Database["public"]['Enums']["trade_status"],"stop_loss": number,"strategy_id"?: string | null,"take_profit"?: number | null,"trigger_1m"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "account_id"?: string,"analysis_id"?: string | null,"asset_id"?: string,"bias_1h"?: Database["public"]['Enums']["market_bias"] | null,"capital_at_entry"?: number,"confirmation_5m"?: string | null,"created_at"?: string,"direction"?: Database["public"]['Enums']["trade_direction"],"emotion_after"?: string | null,"emotion_before"?: string | null,"entry_at"?: string | null,"entry_price"?: number,"exit_at"?: string | null,"exit_price"?: number | null,"fees"?: number,"id"?: string,"lesson"?: string | null,"leverage"?: number,"notes"?: string | null,"quantity"?: number,"setup"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"status"?: Database["public"]['Enums']["trade_status"],"stop_loss"?: number,"strategy_id"?: string | null,"take_profit"?: number | null,"trigger_1m"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trades_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "v_account_balance"
      referencedColumns: ["account_id"]
    },{
      foreignKeyName: "trades_analysis_id_fkey"
      columns: ["analysis_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_strategy_id_fkey"
      columns: ["strategy_id"]
isOneToOne: false
      referencedRelation: "strategies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "v_account_balance": {
                  Row: {
                    "account_id": string,"currency": string,"current_capital": number | null,"initial_capital": number,"name": string,"realized_pnl": number | null,"type": Database["public"]['Enums']["account_type"]
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_daily_pnl": {
                  Row: {
                    "account_id": string,"day": string | null,"fees": number | null,"losses": number | null,"net_pnl": number | null,"total_r": number | null,"trades": number | null,"wins": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "trades_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "v_account_balance"
      referencedColumns: ["account_id"]
    }
                  ]
                },"v_rule_stats": {
                  Row: {
                    "avg_r": number | null,"net_pnl": number | null,"passed": boolean,"rule_id": string,"sort_order": number,"strategy_id": string,"text": string,"trades": number | null,"wins": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "strategy_rules_strategy_id_fkey"
      columns: ["strategy_id"]
isOneToOne: false
      referencedRelation: "strategies"
      referencedColumns: ["id"]
    }
                  ]
                },"v_tag_stats": {
                  Row: {
                    "avg_r": number | null,"color": string | null,"kind": Database["public"]['Enums']["tag_kind"],"losses_pnl": number | null,"name": string,"net_pnl": number | null,"tag_id": string,"trades": number | null,"wins": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_trade_metrics": {
                  Row: {
                    "account_id": string,"analysis_id": string | null,"asset_id": string,"bias_1h": Database["public"]['Enums']["market_bias"] | null,"capital_at_entry": number,"compliance_pct": number | null,"created_at": string,"direction": Database["public"]['Enums']["trade_direction"],"entry_at": string | null,"entry_price": number,"exit_at": string | null,"exit_price": number | null,"fees": number,"gross_pnl": number | null,"id": string,"leverage": number,"local_date": string | null,"net_pnl": number | null,"planned_rr": number | null,"pnl_pct": number | null,"position_value": number | null,"quantity": number,"r_multiple": number | null,"risk_amount": number | null,"risk_pct": number | null,"rules_passed": number | null,"rules_total": number | null,"setup": string | null,"source": Database["public"]['Enums']["content_source"],"status": Database["public"]['Enums']["trade_status"],"stop_loss": number,"strategy_id": string | null,"symbol": string,"take_profit": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "trades_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "v_account_balance"
      referencedColumns: ["account_id"]
    },{
      foreignKeyName: "trades_analysis_id_fkey"
      columns: ["analysis_id"]
isOneToOne: false
      referencedRelation: "analyses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_asset_id_fkey"
      columns: ["asset_id"]
isOneToOne: false
      referencedRelation: "assets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trades_strategy_id_fkey"
      columns: ["strategy_id"]
isOneToOne: false
      referencedRelation: "strategies"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "account_type": "paper"|"real","analysis_outcome": "pending"|"fulfilled"|"partial"|"failed","concept_status": "pending"|"learning"|"mastered","content_source": "claude"|"manual"|"scheduled","goal_kind": "journal_streak"|"winning_trades"|"trades_count"|"net_pnl"|"win_rate"|"custom","market_bias": "bullish"|"bearish"|"neutral","media_entity": "trade"|"analysis"|"market_report"|"concept","media_kind": "before"|"during"|"after"|"analysis"|"report"|"example","report_type": "daily"|"weekly"|"adhoc","tag_kind": "error"|"emotion"|"setup","trade_direction": "long"|"short","trade_status": "planned"|"open"|"closed"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_type": ["paper", "real"],"analysis_outcome": ["pending", "fulfilled", "partial", "failed"],"concept_status": ["pending", "learning", "mastered"],"content_source": ["claude", "manual", "scheduled"],"goal_kind": ["journal_streak", "winning_trades", "trades_count", "net_pnl", "win_rate", "custom"],"market_bias": ["bullish", "bearish", "neutral"],"media_entity": ["trade", "analysis", "market_report", "concept"],"media_kind": ["before", "during", "after", "analysis", "report", "example"],"report_type": ["daily", "weekly", "adhoc"],"tag_kind": ["error", "emotion", "setup"],"trade_direction": ["long", "short"],"trade_status": ["planned", "open", "closed", "cancelled"]
          }
        }
} as const
