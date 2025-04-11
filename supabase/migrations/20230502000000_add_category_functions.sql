-- Function to get cash flow projection
CREATE OR REPLACE FUNCTION get_cash_flow_projection(projection_days INTEGER)
RETURNS TABLE (
  date DATE,
  income DECIMAL(12,2),
  expense DECIMAL(12,2),
  balance DECIMAL(12,2)
) AS $$
DECLARE
  start_date DATE := CURRENT_DATE;
  end_date DATE := CURRENT_DATE + projection_days;
  running_balance DECIMAL(12,2) := 0;
  date_val DATE;
  income_val DECIMAL(12,2);
  expense_val DECIMAL(12,2);
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
  FOR date_val IN SELECT generate_series(start_date, end_date, '1 day') LOOP
    -- Calculate income for this date
    SELECT COALESCE(SUM(amount), 0)
    INTO income_val
    FROM transactions
    WHERE type = 'income' AND due_date::date = date_val AND status = 'pending';
    
    -- Calculate expense for this date
    SELECT COALESCE(SUM(amount), 0)
    INTO expense_val
    FROM transactions
    WHERE type = 'expense' AND due_date::date = date_val AND status = 'pending';
    
    -- Update running balance
    running_balance := running_balance + income_val - expense_val;
    
    -- Return the row
    RETURN QUERY SELECT date_val, income_val, expense_val, running_balance;
  END LOOP;
END;
$$ LANGUAGE plpgsql;