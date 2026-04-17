// =====================================================
// MENÚ HAMBURGUESA (DRAWER) - Igual que el admin web
// =====================================================

import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { 
  Home, 
  Calendar, 
  FileText, 
  Settings, 
  CreditCard,
  Receipt,
  Users,
  X 
} from 'lucide-react-native';

interface MenuItem {
  name: string;
  href: string;
  icon: any;
}

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DrawerMenu({ isOpen, onClose }: DrawerMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, signOut } = useAuth();

  if (!isOpen) return null;

  const menuItems: MenuItem[] = [
    { name: t('navigation.dashboard'), href: '/(app)', icon: Home },
    { name: t('navigation.reservations'), href: '/(app)/reservations', icon: Calendar },
    { name: t('navigation.calendar'), href: '/(app)/calendar', icon: Calendar },
    { name: t('navigation.invoices'), href: '/(app)/invoices', icon: Receipt },
    { name: t('navigation.guestRegistrations'), href: '/(app)/mir-comunicaciones', icon: FileText },
    { name: t('navigation.referrals'), href: '/(app)/referrals', icon: Users },
    { name: t('settings.tabs.paymentLinks'), href: '/(app)/payment-links', icon: CreditCard },
    { name: t('navigation.settings'), href: '/(app)/settings', icon: Settings },
  ];

  const handleNavigate = (href: string) => {
    router.push(href as any);
    onClose();
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)');
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.drawer}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>🐬</Text>
            <Text style={styles.title}>Delfín Check-in</Text>
            {session?.user.tenant.name && (
              <Text style={styles.tenantName}>{session.user.tenant.name}</Text>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView style={styles.menu}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
                           (item.href === '/(app)' && pathname === '/(app)/index');
            
            return (
              <Pressable
                key={item.href}
                style={[styles.menuItem, isActive && styles.menuItemActive]}
                onPress={() => handleNavigate(item.href)}
              >
                <Icon size={20} color={isActive ? '#2563eb' : '#6b7280'} />
                <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{session?.user.email}</Text>
            <Text style={styles.userName}>{session?.user.fullName}</Text>
          </View>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t('dashboard.logout')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    fontSize: 32,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  tenantName: {
    fontSize: 14,
    color: '#6b7280',
  },
  closeButton: {
    padding: 4,
  },
  menu: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  menuItemActive: {
    backgroundColor: '#eff6ff',
  },
  menuText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 12,
  },
  menuTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 20,
  },
  userInfo: {
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

