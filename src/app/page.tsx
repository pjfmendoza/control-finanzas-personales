import { redirect } from 'next/navigation';
import { isRequestAuthenticated } from '@/lib/auth/session';

export default async function HomePage() {
  const isAuth = await isRequestAuthenticated();
  if (isAuth) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
