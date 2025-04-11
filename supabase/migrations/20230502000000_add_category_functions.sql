-- Function to get expenses by category
CREATE OR REPLACE FUNCTION get_expenses_by_category(start_date TIMESTAMP WITH TIME ZONE, end_date TIMESTAMP WITH TIME ZONE)
RETURNS TABLE (
  category_id UUID,
  category_name TEXT,
  total_amount DECIMAL(12,2)
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    COALESCE(SUM(t.amount), 0) as total_amount
  FROM 
    categories c
  LEFT JOIN 
    transactions t ON c.id = t.category_id
  WHERE 
    t.type = 'expense' AND
    t.due_date BETWEEN start_date AND end_date
  GROUP BY 
    c.id, c.name
  ORDER BY 
    total_amount DESC;
END;
$ LANGUAGE plpgsql;

-- Function to get cash flow projection
CREATE OR REPLACE FUNCTION get_cash_flow_projection(projection_days INTEGER)
RETURNS TABLE (
  date DATE,
  income DECIMAL(12,2),
  expense DECIMAL(12,2),
  balance DECIMAL(12,2)
) AS $
DECLARE
  start_date DATE := CURRENT_DATE;
  end_date DATE := CURRENT_DATE + projection_days;
  running_balance DECIMAL(12,2) := 0;
BEGIN
  -- Get current balance
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) 
  INTO running_balance
  FROM 
    transactions 
  WHERE 
    status = 'paid';
  
  -- Generate dates series
  FOR date_val IN SELECT generate_series(start_date, end_date, '1 day')::date LOOP
    -- Calculate income for this date
    SELECT COALESCE(SUM(amount), 0)
    INTO income
    FROM transactions
    WHERE type = 'income' AND due_date::date = date_val AND status = 'pending';
    
    -- Calculate expense for this date
    SELECT COALESCE(SUM(amount), 0)
    INTO expense
    FROM transactions
    WHERE type = 'expense' AND due_date::date = date_val AND status = 'pending';
    
    -- Update running balance
    running_balance := running_balance + income - expense;
    
    -- Return the row
    RETURN QUERY SELECT date_val, income, expense, running_balance;
  END LOOP;
END;
$ LANGUAGE plpgsql;
