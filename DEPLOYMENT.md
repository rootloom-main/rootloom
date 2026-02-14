# Deployment Guide

This guide outlines the steps to deploy the Root&Loom e-commerce application to production.

## Prerequisites

-   A [Vercel](https://vercel.com) or [Netlify](https://netlify.com) account.
-   A [Supabase](https://supabase.com) project.
-   A [Razorpay](https://razorpay.com) account.
-   A [Resend](https://resend.com) account (for emails).
-   A Google Analytics 4 property (optional).

## Environment Variables

Ensure the following environment variables are set in your deployment platform:

### Core
-   `NEXT_PUBLIC_SITE_URL`: The URL of your deployed application (e.g., `https://your-project.vercel.app`).

### Supabase
-   `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
-   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key.
-   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep this secret!).

### Authentication & Payments
-   `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Your Razorpay Key ID.
-   `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret.

### Integrations
-   `RESEND_API_KEY`: Your Resend API Key.
-   `NEXT_PUBLIC_GA_ID`: Your Google Analytics Measurement ID (e.g., `G-XXXXXXXXXX`).

## Deployment Steps (Vercel)

1.  **Import Project**: Connect your GitHub repository to Vercel.
2.  **Configure Project**:
    -   Framework Preset: Next.js
    -   Root Directory: `ecom` (if your project is in a subdirectory) or leave clear if in root.
3.  **Environment Variables**: Add all the variables listed above.
4.  **Deploy**: Click "Deploy". Vercel will build and deploy your application.

## Post-Deployment

1.  **Webhooks**: Configure Razorpay webhooks to point to `https://your-domain.com/api/webhooks/razorpay` (or `api/razorpay/verify-payment` if using direct verification).
2.  **Supabase Auth**: Update your Supabase Auth settings to include your production URL in "Site URL" and "Redirect URLs".
3.  **Storage Policies**: Ensure your Supabase Storage policies for the `products` bucket are correctly set to allow public reads.

## Troubleshooting

-   **Build Errors**: Check the build logs in Vercel. Common issues include missing environment variables during build or linting errors.
-   **Database Issues**: Ensure all migrations have been applied to your production Supabase database.
