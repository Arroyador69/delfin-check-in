import { redirect } from 'next/navigation';

/** Compat: /admin/tap-wall → /es/admin/tap-wall */
export default function AdminTapWallRedirect() {
  redirect('/es/admin/tap-wall');
}
