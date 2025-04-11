-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id),
  registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'canceled')),
  recurrence TEXT CHECK (recurrence IN ('once', 'monthly', 'quarterly', 'yearly')),
  payment_method TEXT,
  notes TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attachments table
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Import history table
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  record_count INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  import_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'partial')),
  notes TEXT
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to get financial summary
CREATE OR REPLACE FUNCTION get_financial_summary(period_type TEXT)
RETURNS JSON AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  result JSON;
BEGIN
  -- Set date range based on period type
  IF period_type = 'week' THEN
    start_date := date_trunc('week', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 week';
  ELSIF period_type = 'month' THEN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
  ELSIF period_type = 'quarter' THEN
    start_date := date_trunc('quarter', CURRENT_DATE);
    end_date := start_date + INTERVAL '3 months';
  ELSIF period_type = 'year' THEN
    start_date := date_trunc('year', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 year';
  ELSE
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
  END IF;
  
  -- Calculate summary
  SELECT json_build_object(
    'balance', COALESCE(
      (SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) 
       FROM transactions 
       WHERE status = 'paid'),
      0
    ),
    'income', COALESCE(
      (SELECT SUM(amount) 
       FROM transactions 
       WHERE type = 'income' AND due_date BETWEEN start_date AND end_date),
      0
    ),
    'expense', COALESCE(
      (SELECT SUM(amount) 
       FROM transactions 
       WHERE type = 'expense' AND due_date BETWEEN start_date AND end_date),
      0
    ),
    'pending_count', COALESCE(
      (SELECT COUNT(*) 
       FROM transactions 
       WHERE status = 'pending' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'),
      0
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get chart data
CREATE OR REPLACE FUNCTION get_financial_chart_data(period_type TEXT)
RETURNS JSON[] AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  interval_type TEXT;
  result JSON[];
  r RECORD;
BEGIN
  -- Set date range and interval based on period type
  IF period_type = 'week' THEN
    start_date := date_trunc('week', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 week';
    interval_type := 'day';
  ELSIF period_type = 'month' THEN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
    interval_type := 'week';
  ELSIF period_type = 'quarter' THEN
    start_date := date_trunc('quarter', CURRENT_DATE);
    end_date := start_date + INTERVAL '3 months';
    interval_type := 'month';
  ELSIF period_type = 'year' THEN
    start_date := date_trunc('year', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 year';
    interval_type := 'month';
  ELSE
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + INTERVAL '1 month';
    interval_type := 'week';
  END IF;
  
  -- Generate series of dates
  FOR r IN 
    SELECT generate_series(start_date, end_date - INTERVAL '1 day', '1 ' || interval_type) as date
  LOOP
    result := array_append(
      result,
      json_build_object(
        'name', 
        CASE 
          WHEN interval_type = 'day' THEN to_char(r.date, 'Dy')
          WHEN interval_type = 'week' THEN 'Semana ' || to_char(r.date, 'W')
          WHEN interval_type = 'month' THEN to_char(r.date, 'Mon')
        END,
        'income', COALESCE(
          (SELECT SUM(amount) 
           FROM transactions 
           WHERE type = 'income' AND 
           CASE 
             WHEN interval_type = 'day' THEN date_trunc('day', due_date) = date_trunc('day', r.date)
             WHEN interval_type = 'week' THEN date_trunc('week', due_date) = date_trunc('week', r.date)
             WHEN interval_type = 'month' THEN date_trunc('month', due_date) = date_trunc('month', r.date)
           END),
          0
        ),
        'expense', COALESCE(
          (SELECT SUM(amount) 
           FROM transactions 
           WHERE type = 'expense' AND 
           CASE 
             WHEN interval_type = 'day' THEN date_trunc('day', due_date) = date_trunc('day', r.date)
             WHEN interval_type = 'week' THEN date_trunc('week', due_date) = date_trunc('week', r.date)
             WHEN interval_type = 'month' THEN date_trunc('month', due_date) = date_trunc('month', r.date)
           END),
          0
        )
      )
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
