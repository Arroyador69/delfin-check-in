import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verificar autenticación
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value

  if (!authToken) {
    redirect('/admin-login')
  }

  // Verificar que sea superadmin
  const payload = verifyToken(authToken)

  if (!isEffectiveSuperAdminPayload(payload)) {
    redirect('/')
  }

  return <div className="pt-16">{children}</div>
}

