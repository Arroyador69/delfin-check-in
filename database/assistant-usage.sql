-- Uso mensual del Asistente por tenant (límite ej. 400 mensajes/mes)
CREATE TABLE IF NOT EXISTS assistant_usage (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (tenant_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_assistant_usage_tenant_month ON assistant_usage(tenant_id, month_key);

COMMENT ON TABLE assistant_usage IS 'Contador de mensajes del Asistente por tenant y mes (YYYY-MM). Límite configurable por plan.';
