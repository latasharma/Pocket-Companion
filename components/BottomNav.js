import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const navItems = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home', route: '/' },
  { key: 'reminders', label: 'Reminders', icon: 'notifications-outline', activeIcon: 'notifications', route: '/Reminders/ShowReminderOptionsScreen' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person', route: '/profile' },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const isActive =
          pathname === item.route ||
          (item.route === '/' && (pathname === '/dashboard' || pathname === '/dashboard-details'));
        const iconName = isActive ? item.activeIcon : item.icon;
        const color = isActive ? '#10b981' : '#6b7280';

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.navItem}
            onPress={() => router.push(item.route)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Ionicons name={iconName} size={22} color={color} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  navItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
