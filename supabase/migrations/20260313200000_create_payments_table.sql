-- Create payments table for Razorpay flow tracking
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id text NOT NULL UNIQUE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'INR',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  cart_snapshot jsonb NOT NULL,
  address_id uuid REFERENCES addresses(id) ON DELETE SET NULL,
  coupon_code text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Updated at trigger
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
