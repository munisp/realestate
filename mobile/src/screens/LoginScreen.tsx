/**
 * Enhanced LoginScreen - Biometric Auth + Haptic Feedback + Secure Storage
 * expo-local-authentication, expo-haptics, expo-secure-store
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Animated,
} from 'react-native';

let LocalAuthentication: any = null;
let Haptics: any = null;
let SecureStore: any = null;
try { LocalAuthentication = require('expo-local-authentication'); } catch {}
try { Haptics = require('expo-haptics'); } catch {}
try { SecureStore = require('expo-secure-store'); } catch {}

const SECURE_TOKEN_KEY = 'naijahomes_auth_token';
const SECURE_BIOMETRIC_KEY = 'naijahomes_biometric_enabled';

type AuthMode = 'login' | 'signup' | 'forgot';

interface LoginScreenProps { navigation?: any; }

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => { checkBiometrics(); checkSavedToken(); }, []);

  const checkBiometrics = async () => {
    if (!LocalAuthentication) return;
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (compatible && enrolled) {
        setBiometricAvailable(true);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        setBiometricType(types.includes(2) ? 'face' : 'fingerprint');
        const saved = await SecureStore?.getItemAsync(SECURE_BIOMETRIC_KEY);
        if (saved === 'true') { setBiometricEnabled(true); setTimeout(() => handleBiometricAuth(), 600); }
      }
    } catch {}
  };

  const checkSavedToken = async () => {
    if (!SecureStore) return;
    try {
      const token = await SecureStore.getItemAsync(SECURE_TOKEN_KEY);
      if (token) navigation?.replace?.('HomeTabs');
    } catch {}
  };

  const haptic = useCallback((t: 'light'|'medium'|'success'|'error' = 'light') => {
    if (!Haptics) return;
    try {
      if (t === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      else if (t === 'error') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      else if (t === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    if (!LocalAuthentication || !biometricAvailable) return;
    haptic('light');
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access NaijaHomes',
        fallbackLabel: 'Use Password',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        haptic('success');
        const token = await SecureStore?.getItemAsync(SECURE_TOKEN_KEY);
        if (token) navigation?.replace?.('HomeTabs');
        else Alert.alert('Session Expired', 'Please log in with your password.');
      } else haptic('error');
    } catch {}
  }, [biometricAvailable, haptic, navigation]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (mode !== 'forgot') {
      if (!password) e.password = 'Password is required';
      else if (password.length < 8) e.password = 'Min. 8 characters';
    }
    if (mode === 'signup' && password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) haptic('error');
    return Object.keys(e).length === 0;
  }, [email, password, confirmPassword, mode, haptic]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    haptic('medium');
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 1500));
      const token = `mock_token_${Date.now()}`;
      if (mode !== 'forgot') {
        await SecureStore?.setItemAsync(SECURE_TOKEN_KEY, token);
        if (biometricAvailable && !biometricEnabled && mode === 'login') {
          Alert.alert(
            `Enable ${biometricType === 'face' ? 'Face ID' : 'Fingerprint'} Login?`,
            'Use biometrics for faster, more secure access.',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Enable', onPress: async () => {
                await SecureStore?.setItemAsync(SECURE_BIOMETRIC_KEY, 'true');
                setBiometricEnabled(true); haptic('success');
              }},
            ]
          );
        }
        haptic('success');
        navigation?.replace?.('HomeTabs');
      } else {
        haptic('success');
        Alert.alert('Check Your Email', 'We sent a password reset link.');
        setMode('login');
      }
    } catch (e: any) {
      haptic('error');
      Alert.alert('Authentication Failed', e.message || 'Please try again.');
    } finally { setLoading(false); }
  }, [validate, haptic, mode, biometricAvailable, biometricEnabled, biometricType, navigation]);

  const switchMode = useCallback((m: AuthMode) => {
    haptic('light');
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setMode(m); setErrors({});
  }, [haptic, fadeAnim]);

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>🏠</Text>
          <Text style={s.appName}>NaijaHomes</Text>
          <Text style={s.tagline}>Find Your Perfect Home</Text>
        </View>
        <View style={s.modeTabs} accessibilityRole="tablist">
          {(['login', 'signup'] as AuthMode[]).map(m => (
            <TouchableOpacity key={m} style={[s.modeTab, mode === m && s.modeTabActive]}
              onPress={() => switchMode(m)} accessibilityRole="tab" accessibilityState={{ selected: mode === m }}>
              <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Animated.View style={[s.form, { opacity: fadeAnim }]}>
          <View style={s.field}>
            <Text style={s.label}>Email Address</Text>
            <TextInput style={[s.input, errors.email && s.inputErr]} value={email} onChangeText={setEmail}
              placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
              accessibilityLabel="Email address" />
            {errors.email && <Text style={s.err}>{errors.email}</Text>}
          </View>
          {mode !== 'forgot' && (
            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <View style={s.pwRow}>
                <TextInput style={[s.input, s.pwInput, errors.password && s.inputErr]} value={password}
                  onChangeText={setPassword} placeholder="Min. 8 characters" secureTextEntry={!showPassword}
                  accessibilityLabel="Password" />
                <TouchableOpacity style={s.eyeBtn} onPress={() => { setShowPassword(!showPassword); haptic('light'); }}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                  <Text>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={s.err}>{errors.password}</Text>}
            </View>
          )}
          {mode === 'signup' && (
            <View style={s.field}>
              <Text style={s.label}>Confirm Password</Text>
              <TextInput style={[s.input, errors.confirmPassword && s.inputErr]} value={confirmPassword}
                onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry={!showPassword}
                accessibilityLabel="Confirm password" />
              {errors.confirmPassword && <Text style={s.err}>{errors.confirmPassword}</Text>}
            </View>
          )}
          {mode === 'login' && (
            <TouchableOpacity onPress={() => switchMode('forgot')} style={s.forgotLink} accessibilityRole="link">
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.submitBtn, loading && s.submitDisabled]} onPress={handleSubmit}
            disabled={loading} accessibilityRole="button"
            accessibilityLabel={mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}>
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={s.submitText}>{mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}</Text>}
          </TouchableOpacity>
          {biometricAvailable && mode === 'login' && (
            <TouchableOpacity style={s.biometricBtn} onPress={handleBiometricAuth} accessibilityRole="button"
              accessibilityLabel={`Sign in with ${biometricType === 'face' ? 'Face ID' : 'Fingerprint'}`}>
              <Text style={s.biometricIcon}>{biometricType === 'face' ? '🔒' : '👆'}</Text>
              <Text style={s.biometricText}>Sign in with {biometricType === 'face' ? 'Face ID' : 'Fingerprint'}</Text>
            </TouchableOpacity>
          )}
          <View style={s.divider}>
            <View style={s.divLine} /><Text style={s.divText}>or</Text><View style={s.divLine} />
          </View>
          <View style={s.socialRow}>
            {[{icon:'🌐',label:'Google'},{icon:'📘',label:'Facebook'}].map(({icon,label}) => (
              <TouchableOpacity key={label} style={s.socialBtn} onPress={() => haptic('light')}
                accessibilityRole="button" accessibilityLabel={`Continue with ${label}`}>
                <Text style={s.socialIcon}>{icon}</Text>
                <Text style={s.socialText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
        {mode === 'signup' && (
          <Text style={s.terms}>By signing up you agree to our <Text style={s.termsLink}>Terms</Text> and <Text style={s.termsLink}>Privacy Policy</Text></Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:'#f8fafc'},
  scroll:{flexGrow:1,paddingHorizontal:24,paddingVertical:40},
  header:{alignItems:'center',marginBottom:32},
  logo:{fontSize:48,marginBottom:8},
  appName:{fontSize:28,fontWeight:'800',color:'#0f172a'},
  tagline:{fontSize:14,color:'#64748b',marginTop:4},
  modeTabs:{flexDirection:'row',backgroundColor:'#e2e8f0',borderRadius:12,padding:4,marginBottom:24},
  modeTab:{flex:1,paddingVertical:10,alignItems:'center',borderRadius:10},
  modeTabActive:{backgroundColor:'#fff',shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.1,shadowRadius:2,elevation:2},
  modeTabText:{fontSize:14,fontWeight:'500',color:'#64748b'},
  modeTabTextActive:{color:'#0f172a',fontWeight:'700'},
  form:{gap:16},
  field:{gap:6},
  label:{fontSize:13,fontWeight:'600',color:'#374151'},
  input:{backgroundColor:'#fff',borderWidth:1.5,borderColor:'#e2e8f0',borderRadius:12,paddingHorizontal:16,paddingVertical:14,fontSize:15,color:'#0f172a'},
  inputErr:{borderColor:'#ef4444'},
  pwRow:{flexDirection:'row',alignItems:'center'},
  pwInput:{flex:1},
  eyeBtn:{position:'absolute',right:14,padding:4},
  err:{fontSize:12,color:'#ef4444',marginTop:2},
  forgotLink:{alignSelf:'flex-end',marginTop:-8},
  forgotText:{fontSize:13,color:'#3b82f6',fontWeight:'500'},
  submitBtn:{backgroundColor:'#3b82f6',borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:8},
  submitDisabled:{opacity:0.7},
  submitText:{color:'#fff',fontSize:16,fontWeight:'700'},
  biometricBtn:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10,paddingVertical:14,borderWidth:1.5,borderColor:'#e2e8f0',borderRadius:14,backgroundColor:'#fff'},
  biometricIcon:{fontSize:22},
  biometricText:{fontSize:15,fontWeight:'600',color:'#374151'},
  divider:{flexDirection:'row',alignItems:'center',gap:12,marginVertical:4},
  divLine:{flex:1,height:1,backgroundColor:'#e2e8f0'},
  divText:{fontSize:12,color:'#94a3b8'},
  socialRow:{flexDirection:'row',gap:12},
  socialBtn:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingVertical:13,borderWidth:1.5,borderColor:'#e2e8f0',borderRadius:12,backgroundColor:'#fff'},
  socialIcon:{fontSize:18},
  socialText:{fontSize:14,fontWeight:'600',color:'#374151'},
  terms:{fontSize:12,color:'#94a3b8',textAlign:'center',marginTop:20,lineHeight:18},
  termsLink:{color:'#3b82f6',fontWeight:'500'},
});
