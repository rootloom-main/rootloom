# Root&Loom E-commerce Platform

A modern, full-stack e-commerce platform built with Next.js 14, TypeScript, Supabase, and Razorpay.

## Features

### User Features
- Browse products with filters and sorting
- Product details with size and color variants
- Shopping cart functionality
- Secure checkout with Razorpay integration
- User authentication (email/password)
- Order history and tracking
- Responsive design for all devices

### Admin Features
- Order management dashboard
- Update order status
- Add tracking numbers
- View customer information

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Razorpay
- **Deployment**: Vercel/Netlify

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account
- Razorpay account (for payments)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stylehub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your project URL and anon key
4. The database schema is already applied through the MCP integration

### 4. Set Up Razorpay

1. Sign up at [razorpay.com](https://razorpay.com)
2. Get your API keys from Dashboard > Settings > API Keys
3. Use test keys for development

### 5. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Database Schema

The database includes the following tables:
- `profiles` - User profiles with role management
- `categories` - Product categories
- `products` - Product information
- `product_images` - Product image URLs
- `product_variants` - Size, color, stock, and pricing variants
- `cart_items` - Shopping cart data
- `addresses` - User shipping addresses
- `orders` - Order information
- `order_items` - Order line items

All tables include Row Level Security (RLS) policies for data protection.

## Creating an Admin User

1. Sign up for a new account through the UI
2. Go to your Supabase dashboard
3. Navigate to Table Editor > profiles
4. Find your user and change the `role` column from `user` to `admin`
5. Refresh the application

## Testing Payments

Use Razorpay test credentials:
- **Card Number**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Add environment variables in Netlify dashboard
4. Set build command: `npm run build`
5. Set publish directory: `.next`
6. Deploy

## Project Structure

```
├── app/                    # Next.js 14 app directory
│   ├── (routes)/          # Application routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── layout/           # Layout components
│   ├── product/          # Product components
│   ├── providers/        # Context providers
│   └── ui/               # UI components (shadcn)
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   └── utils/            # Helper functions
├── types/                 # TypeScript types
└── public/               # Static assets
```

## Key Pages

- `/` - Home page
- `/shop` - Product listing with filters
- `/product/[slug]` - Product details
- `/cart` - Shopping cart
- `/checkout` - Checkout page
- `/auth/login` - User login
- `/auth/signup` - User registration
- `/account` - User dashboard
- `/account/orders` - Order history
- `/admin` - Admin dashboard
- `/admin/orders` - Order management

## API Routes

- `POST /api/razorpay/create-order` - Create Razorpay order
- `POST /api/razorpay/verify-payment` - Verify payment and create order

## Customization

### Adding Products

Use the Supabase dashboard to add products:
1. Add category in `categories` table
2. Add product in `products` table
3. Add images in `product_images` table
4. Add variants in `product_variants` table

### Styling

The project uses TailwindCSS. Modify styles in:
- `app/globals.css` - Global styles
- `tailwind.config.ts` - Tailwind configuration

## Support

For issues or questions, please create an issue in the repository.

## License

MIT License
