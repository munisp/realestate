import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { LINKING_CONFIG } from './src/navigation/DeepLinkHandler';

// Core screens
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import KYCScreen from './src/screens/KYCScreen';
import LoginScreen from './src/screens/LoginScreen';

// New screens — Batch 1
import BookingScreen from './src/screens/BookingScreen';
import AgentProfileScreen from './src/screens/AgentProfileScreen';

// New screens — Batch 2
import NotificationsScreen from './src/screens/NotificationsScreen';
import MortgageCalculatorScreen from './src/screens/MortgageCalculatorScreen';
import PaymentScreen from './src/screens/PaymentScreen';

// New screens — Batch 3
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MapLibreMapScreen from './src/screens/MapLibreMapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Home: focused ? 'home' : 'home-outline',
            Search: focused ? 'search' : 'search-outline',
            Favorites: focused ? 'heart' : 'heart-outline',
            Dashboard: focused ? 'grid' : 'grid-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Icon name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={LINKING_CONFIG}>
        <Stack.Navigator initialRouteName="Onboarding">
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ title: 'Property Details' }} />
          <Stack.Screen name="KYC" component={KYCScreen} options={{ title: 'Verify Identity' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book a Tour' }} />
          <Stack.Screen name="AgentProfile" component={AgentProfileScreen} options={{ title: 'Agent Profile' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
          <Stack.Screen name="MortgageCalculator" component={MortgageCalculatorScreen} options={{ title: 'Mortgage Calculator' }} />
          <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Make Payment' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="MapSearch" component={MapLibreMapScreen} options={{ title: 'Map Search', headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
