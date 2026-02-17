import { LoginForm } from '@/components/auth/login-form';

export const metadata = {
  title: 'Login | Root & Loom',
  description: 'Sign in to your Root & Loom account.',
};

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16 flex justify-center items-center min-h-[60vh]">
      <LoginForm />
    </div>
  );
}
