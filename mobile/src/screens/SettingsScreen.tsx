import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen({ navigation }: any) {
  const [pushNotifs, setPushNotifs] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  const sections = [
    {
      title: 'Notifications',
      items: [
        { label: 'Push Notifications', value: pushNotifs, onChange: setPushNotifs },
        { label: 'Price Drop Alerts', value: priceAlerts, onChange: setPriceAlerts },
      ],
    },
    {
      title: 'Security',
      items: [
        { label: 'Biometric Login', value: biometric, onChange: setBiometric },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { label: 'Dark Mode', value: darkMode, onChange: setDarkMode },
        { label: 'Location Services', value: locationServices, onChange: setLocationServices },
      ],
    },
  ];

  const links = [
    { label: 'Privacy Policy', icon: '🔒', onPress: () => {} },
    { label: 'Terms of Service', icon: '📄', onPress: () => {} },
    { label: 'Help & Support', icon: '❓', onPress: () => {} },
    { label: 'Rate the App', icon: '⭐', onPress: () => {} },
    { label: 'About NaijaHomes', icon: 'ℹ️', onPress: () => {} },
    { label: 'Sign Out', icon: '🚪', onPress: () => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign Out', style: 'destructive', onPress: () => navigation.replace('Login') }]), danger: true },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <Text style={s.title}>Settings</Text>
        {sections.map(sec => (
          <View key={sec.title} style={s.section}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            {sec.items.map(item => (
              <View key={item.label} style={s.row}>
                <Text style={s.rowLabel}>{item.label}</Text>
                <Switch value={item.value} onValueChange={item.onChange} trackColor={{ true: '#007AFF' }} />
              </View>
            ))}
          </View>
        ))}
        <View style={s.section}>
          <Text style={s.sectionTitle}>General</Text>
          {links.map(link => (
            <TouchableOpacity key={link.label} style={s.linkRow} onPress={link.onPress}>
              <Text style={s.linkIcon}>{link.icon}</Text>
              <Text style={[s.linkLabel, (link as any).danger && s.danger]}>{link.label}</Text>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.version}>NaijaHomes v1.0.0 · Build 100</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  title: { fontSize: 28, fontWeight: '700', padding: 20, paddingBottom: 8 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#888', padding: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#f5f5f5' },
  rowLabel: { flex: 1, fontSize: 16 },
  linkRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1, borderColor: '#f5f5f5' },
  linkIcon: { fontSize: 20, marginRight: 12, width: 28 },
  linkLabel: { flex: 1, fontSize: 16 },
  danger: { color: '#ef4444' },
  chevron: { fontSize: 20, color: '#ccc' },
  version: { textAlign: 'center', color: '#aaa', fontSize: 12, padding: 20 },
});
