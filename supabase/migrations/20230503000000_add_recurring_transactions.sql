-- Add next_generation_date column to transactions table
ALTER TABLE transactions ADD COLUMN next_generation_date TIMESTAMP WITH TIME ZONE;

-- Add parent_transaction_id column to transactions table
ALTER TABLE transactions ADD COLUMN parent_transaction_id UUID REFERENCES transactions(id);

-- Create a function to update transaction status based on due date
CREATE OR REPLACE FUNCTION update_transaction_status()
RETURNS TRIGGER AS $
BEGIN
  -- If the transaction is pending and due date is in the past, mark as late
  IF NEW.status = 'pending' AND NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'late';
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create a trigger to automatically update transaction status
CREATE TRIGGER update_transaction_status_trigger
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_transaction_status();
