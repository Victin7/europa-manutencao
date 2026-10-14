export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          created_at: string
          email: string | null
          event: string
          id: string
          ip: string | null
          perfil: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event: string
          id?: string
          ip?: string | null
          perfil?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event?: string
          id?: string
          ip?: string | null
          perfil?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ativos: {
        Row: {
          categoria: string
          codigo_interno: string | null
          created_at: string
          created_by: string | null
          data_instalacao: string | null
          empresa_responsavel: string | null
          fabricante: string | null
          foto_path: string | null
          garantia_ate: string | null
          id: string
          local: string | null
          manual_path: string | null
          modelo: string | null
          nivel: number
          nome: string
          numero_patrimonio: string | null
          numero_serie: string | null
          observacoes: string | null
          parent_id: string | null
          proxima_preventiva: string | null
          status_ativo: string
          tipo: string
          torre: string | null
          ultima_manutencao: string | null
          updated_at: string
        }
        Insert: {
          categoria: string
          codigo_interno?: string | null
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          empresa_responsavel?: string | null
          fabricante?: string | null
          foto_path?: string | null
          garantia_ate?: string | null
          id?: string
          local?: string | null
          manual_path?: string | null
          modelo?: string | null
          nivel?: number
          nome: string
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          parent_id?: string | null
          proxima_preventiva?: string | null
          status_ativo?: string
          tipo?: string
          torre?: string | null
          ultima_manutencao?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string
          codigo_interno?: string | null
          created_at?: string
          created_by?: string | null
          data_instalacao?: string | null
          empresa_responsavel?: string | null
          fabricante?: string | null
          foto_path?: string | null
          garantia_ate?: string | null
          id?: string
          local?: string | null
          manual_path?: string | null
          modelo?: string | null
          nivel?: number
          nome?: string
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          parent_id?: string | null
          proxima_preventiva?: string | null
          status_ativo?: string
          tipo?: string
          torre?: string | null
          ultima_manutencao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ativos_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencao_equipe: {
        Row: {
          adicionado_em: string
          adicionado_por: string | null
          id: string
          manutencao_id: string
          nome_funcionario: string
        }
        Insert: {
          adicionado_em?: string
          adicionado_por?: string | null
          id?: string
          manutencao_id: string
          nome_funcionario: string
        }
        Update: {
          adicionado_em?: string
          adicionado_por?: string | null
          id?: string
          manutencao_id?: string
          nome_funcionario?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_equipe_manutencao_id_fkey"
            columns: ["manutencao_id"]
            isOneToOne: false
            referencedRelation: "manutencoes"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          area_comum: string | null
          arts: Json
          ativo_id: string | null
          categoria: string
          contratos: Json
          created_at: string
          data_agendada: string | null
          data_conclusao: string | null
          data_impressao: string | null
          data_inicio: string | null
          data_prevista: string | null
          data_solicitacao: string | null
          data_vistoria: string | null
          descricao: string
          documentos: Json
          foto_antes: Json
          foto_depois: Json
          fotos: Json
          funcionario: string | null
          funcionario_acompanhante: string | null
          garantia_dias: number | null
          id: string
          laudos: Json
          local_manutencao: string
          notas_fiscais: Json
          numero_chamado: string
          numero_os: string
          observacao: string | null
          orcamentos: Json
          prestador_id: string | null
          prestador_responsavel: string | null
          prioridade: string
          relatorios: Json
          status: string
          timeline_events: Json
          tipo_servico: string
          torre: string | null
          unidade: string | null
          updated_at: string
          valor_mao_obra: number | null
          valor_material: number | null
          valor_servico: number | null
          valor_total: number | null
        }
        Insert: {
          area_comum?: string | null
          arts?: Json
          ativo_id?: string | null
          categoria: string
          contratos?: Json
          created_at?: string
          data_agendada?: string | null
          data_conclusao?: string | null
          data_impressao?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          data_solicitacao?: string | null
          data_vistoria?: string | null
          descricao: string
          documentos?: Json
          foto_antes?: Json
          foto_depois?: Json
          fotos?: Json
          funcionario?: string | null
          funcionario_acompanhante?: string | null
          garantia_dias?: number | null
          id?: string
          laudos?: Json
          local_manutencao?: string
          notas_fiscais?: Json
          numero_chamado: string
          numero_os: string
          observacao?: string | null
          orcamentos?: Json
          prestador_id?: string | null
          prestador_responsavel?: string | null
          prioridade?: string
          relatorios?: Json
          status?: string
          timeline_events?: Json
          tipo_servico?: string
          torre?: string | null
          unidade?: string | null
          updated_at?: string
          valor_mao_obra?: number | null
          valor_material?: number | null
          valor_servico?: number | null
          valor_total?: number | null
        }
        Update: {
          area_comum?: string | null
          arts?: Json
          ativo_id?: string | null
          categoria?: string
          contratos?: Json
          created_at?: string
          data_agendada?: string | null
          data_conclusao?: string | null
          data_impressao?: string | null
          data_inicio?: string | null
          data_prevista?: string | null
          data_solicitacao?: string | null
          data_vistoria?: string | null
          descricao?: string
          documentos?: Json
          foto_antes?: Json
          foto_depois?: Json
          fotos?: Json
          funcionario?: string | null
          funcionario_acompanhante?: string | null
          garantia_dias?: number | null
          id?: string
          laudos?: Json
          local_manutencao?: string
          notas_fiscais?: Json
          numero_chamado?: string
          numero_os?: string
          observacao?: string | null
          orcamentos?: Json
          prestador_id?: string | null
          prestador_responsavel?: string | null
          prioridade?: string
          relatorios?: Json
          status?: string
          timeline_events?: Json
          tipo_servico?: string
          torre?: string | null
          unidade?: string | null
          updated_at?: string
          valor_mao_obra?: number | null
          valor_material?: number | null
          valor_servico?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      prestador_avaliacoes: {
        Row: {
          atendimento: number
          avaliado_por: string | null
          comentario: string | null
          created_at: string
          id: string
          limpeza: number
          manutencao_id: string | null
          nota_geral: number
          organizacao: number
          prazo: number
          prestador_id: string
          qualidade: number
        }
        Insert: {
          atendimento?: number
          avaliado_por?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          limpeza?: number
          manutencao_id?: string | null
          nota_geral?: number
          organizacao?: number
          prazo?: number
          prestador_id: string
          qualidade?: number
        }
        Update: {
          atendimento?: number
          avaliado_por?: string | null
          comentario?: string | null
          created_at?: string
          id?: string
          limpeza?: number
          manutencao_id?: string | null
          nota_geral?: number
          organizacao?: number
          prazo?: number
          prestador_id?: string
          qualidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "prestador_avaliacoes_prestador_id_fkey"
            columns: ["prestador_id"]
            isOneToOne: false
            referencedRelation: "prestadores"
            referencedColumns: ["id"]
          },
        ]
      }
      prestadores: {
        Row: {
          categoria: string
          cnpj: string | null
          created_at: string
          created_by: string | null
          documentos: Json
          email: string | null
          id: string
          logo_path: string | null
          nome_empresa: string
          observacoes: string | null
          responsavel: string | null
          status: string
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          categoria?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json
          email?: string | null
          id?: string
          logo_path?: string | null
          nome_empresa: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          categoria?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          documentos?: Json
          email?: string | null
          id?: string
          logo_path?: string | null
          nome_empresa?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          display_name: string
          is_principal: boolean
          nome: string
          pin_failed_attempts: number
          pin_hash: string | null
          pin_locked_until: string | null
          pin_updated_at: string | null
          status: string
          telefone: string | null
          torre: string | null
          ultimo_acesso: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          display_name: string
          is_principal?: boolean
          nome?: string
          pin_failed_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_updated_at?: string | null
          status?: string
          telefone?: string | null
          torre?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          display_name?: string
          is_principal?: boolean
          nome?: string
          pin_failed_attempts?: number
          pin_hash?: string | null
          pin_locked_until?: string | null
          pin_updated_at?: string | null
          status?: string
          telefone?: string | null
          torre?: string | null
          ultimo_acesso?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      set_pin_proxy: {
        Args: { _pin: string; _user_id: string }
        Returns: undefined
      }
      verify_pin_proxy: {
        Args: { _pin: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "sindico" | "subsindico" | "conselheiro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "sindico", "subsindico", "conselheiro"],
    },
  },
} as const
