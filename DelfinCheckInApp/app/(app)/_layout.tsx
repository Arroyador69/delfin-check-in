// =====================================================
// LAYOUT DE LA APP (Tabs + Menú Hamburguesa)
// =====================================================

import { Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Redirect } from 'expo-router';
import { Text, Pressable } from 'react-native';
import { useState } from 'react';
import DrawerMenu from '@/components/DrawerMenu';
import { Menu } from 'lucide-react-native';
import PendingReservationsBell from '@/components/PendingReservationsBell';
import { t } from '@/lib/i18n';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/(auth)" />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitleAlign: 'center',
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          headerLeft: () => (
            <Pressable
              onPress={() => setDrawerOpen(true)}
              style={{ marginLeft: 16, padding: 8 }}
            >
              <Menu size={24} color="#1f2937" />
            </Pressable>
          ),
          headerRight: () => <PendingReservationsBell />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('navigation.dashboard'),
            tabBarLabel: t('navigation.dashboard'),
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="reservations"
          options={{
            title: t('navigation.reservations'),
            tabBarLabel: t('navigation.reservations'),
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>📅</Text>,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: t('navigation.calendar'),
            tabBarLabel: t('navigation.calendar'),
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>📆</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('navigation.settings'),
            tabBarLabel: t('navigation.settings'),
            tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
          }}
        />
        {/* Pantallas ocultas del menú hamburguesa */}
        <Tabs.Screen
          name="invoices"
          options={{
            href: null, // Ocultar del tab bar
            title: t('navigation.invoices'),
          }}
        />
        <Tabs.Screen
          name="mir-comunicaciones"
          options={{
            href: null,
            title: t('navigation.guestRegistrations'),
          }}
        />
        <Tabs.Screen
          name="payment-links"
          options={{
            href: null,
            title: t('settings.tabs.paymentLinks'),
          }}
        />
        <Tabs.Screen
          name="referrals"
          options={{
            href: null,
            title: t('referrals.title'),
          }}
        />
        <Tabs.Screen
          name="onboarding"
          options={{
            href: null,
            title: t('mobile.onboarding.title'),
          }}
        />
      </Tabs>
      <DrawerMenu isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
