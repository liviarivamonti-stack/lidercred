-- Realize Score - Schema Atualizado
-- Suporte a Roles, Clientes, Cobranças e Follow-ups

CREATE DATABASE realize_score;
\c realize_score;

-- Tabela de Times (Multi-tenant)
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(10) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Usuários com Roles
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'sales' CHECK (role IN ('sales', 'collections', 'leader')),
  notes TEXT, -- Anotações privadas do vendedor
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Clientes (Contratos)
CREATE TABLE clients (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  seller_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(150) NOT NULL,
  document VARCHAR(20), -- CPF/CNPJ
  phone VARCHAR(20),
  email VARCHAR(150),
  contract_value NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'late', 'agreement', 'finished')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Cobranças/Parcelas
CREATE TABLE installments (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Follow-ups
CREATE TABLE follow_ups (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  due_date TIMESTAMP NOT NULL,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de Vendas (Legado/Score)
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_user_id ON sales(user_id);
CREATE INDEX idx_clients_team_id ON clients(team_id);
CREATE INDEX idx_installments_client_id ON installments(client_id);

-- View de Ranking Atualizada por Time
CREATE VIEW seller_totals AS
SELECT
  u.id,
  u.team_id,
  u.name,
  u.email,
  u.role,
  COALESCE(SUM(s.amount), 0) AS total,
  COUNT(s.id) AS num_sales
FROM users u
LEFT JOIN sales s ON s.user_id = u.id
GROUP BY u.id, u.team_id, u.name, u.email, u.role
ORDER BY total DESC;
