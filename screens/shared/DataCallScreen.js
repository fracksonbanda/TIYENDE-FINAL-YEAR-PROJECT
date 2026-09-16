import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import {
  buildDataCallUrl,
  getPeerForRequest,
  logDataCallStarted,
} from '../../services/chatService';
import { colors, radius } from '../../theme';

export default function DataCallScreen({ navigation, route }) {
  const request = route.params?.request;
  const [loadFailed, setLoadFailed] = useState(false);
  const loggedCallRef = useRef(false);
  const peer = useMemo(() => getPeerForRequest(request), [request]);
  const callUrl = useMemo(() => (request?.id ? buildDataCallUrl(request) : ''), [request]);

  useEffect(() => {
    if (!request?.id || loggedCallRef.current) return;
    loggedCallRef.current = true;
    logDataCallStarted(request).catch(() => {});
  }, [request]);

  const openExternal = async () => {
    if (!callUrl) return;
    const supported = await Linking.canOpenURL(callUrl);
    if (supported) {
      Linking.openURL(callUrl);
    } else {
      Alert.alert('Data Call', 'Could not open the call room on this device.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.black} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-down" size={24} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Data Call</Text>
          <Text style={styles.subtitle}>{peer.name || peer.role || 'Trip contact'}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={openExternal}>
          <Ionicons name="open-outline" size={21} color={colors.white} />
        </TouchableOpacity>
      </View>

      {callUrl && !loadFailed ? (
        <WebView
          source={{ uri: callUrl }}
          style={styles.webview}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
          originWhitelist={['*']}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.loadingText}>Connecting...</Text>
            </View>
          )}
          onError={() => setLoadFailed(true)}
          onHttpError={() => setLoadFailed(true)}
        />
      ) : (
        <View style={styles.failed}>
          <Ionicons name="videocam-off-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.failedTitle}>Could not load the call</Text>
          <Text style={styles.failedSub}>Open the same secure room in your browser and continue using mobile data or Wi-Fi.</Text>
          <TouchableOpacity style={styles.externalBtn} onPress={openExternal}>
            <Ionicons name="open-outline" size={18} color={colors.white} />
            <Text style={styles.externalText}>Open Call Room</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Ionicons name="wifi-outline" size={16} color={colors.textTertiary} />
        <Text style={styles.footerText}>Uses internet data. Allow microphone and camera permissions when prompted.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.black,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerText: { flex: 1 },
  title: { color: colors.white, fontSize: 17, fontWeight: '900' },
  subtitle: { color: '#8B949E', fontSize: 12, fontWeight: '700', marginTop: 2 },
  webview: { flex: 1, backgroundColor: colors.black },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.black },
  loadingText: { color: colors.white, fontSize: 13, fontWeight: '700', marginTop: 10 },
  failed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: colors.offWhite },
  failedTitle: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginTop: 14 },
  failedSub: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: 18 },
  externalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  externalText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.black,
  },
  footerText: { flex: 1, color: colors.textTertiary, fontSize: 11, fontWeight: '700' },
});
