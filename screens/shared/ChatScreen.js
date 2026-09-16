import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../../firebase';
import {
  getPeerForRequest,
  sendRequestMessage,
  watchRequestMessages,
} from '../../services/chatService';
import { colors, radius, shadows } from '../../theme';
import { initialsFromName } from '../../utils/geo';

function Avatar({ name, photoURL, size = 40 }) {
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryGhost }} />;
  }

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{initialsFromName(name)}</Text>
    </View>
  );
}

function formatMessageTime(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageRow({ item }) {
  const mine = item.senderId === auth.currentUser?.uid;
  const isCall = item.type === 'call';

  if (isCall) {
    return (
      <View style={styles.callNotice}>
        <Ionicons name="call-outline" size={14} color={colors.primary} />
        <Text style={styles.callNoticeText}>{item.senderName} started a data call</Text>
      </View>
    );
  }

  return (
    <View style={[styles.messageRow, mine ? styles.messageMineRow : styles.messagePeerRow]}>
      <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messagePeer]}>
        <Text style={[styles.messageText, mine ? styles.messageMineText : styles.messagePeerText]}>
          {item.body}
        </Text>
        <Text style={[styles.messageTime, mine ? styles.messageMineTime : styles.messagePeerTime]}>
          {formatMessageTime(item.createdAtMs)}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen({ navigation, route }) {
  const request = route.params?.request;
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const peer = useMemo(() => getPeerForRequest(request), [request]);
  const canChat = Boolean(request?.id && request?.driverId);

  useEffect(() => {
    if (!request?.id) return undefined;
    setLoading(true);
    return watchRequestMessages(request.id, (items) => {
      setMessages(items);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      Alert.alert('Chat', error.message);
    });
  }, [request?.id]);

  const sendMessage = async () => {
    if (!draft.trim() || sending || !canChat) return;
    const nextMessage = draft;
    setDraft('');
    setSending(true);
    try {
      await sendRequestMessage(request, nextMessage);
    } catch (error) {
      setDraft(nextMessage);
      Alert.alert('Message Failed', error.message);
    } finally {
      setSending(false);
    }
  };

  const openCall = () => {
    if (!canChat) return;
    navigation.navigate('DataCall', { request });
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Avatar name={peer.name} photoURL={peer.photoURL} />
        <View style={styles.headerText}>
          <Text style={styles.peerName}>{peer.name || 'Waiting for driver'}</Text>
          <Text style={styles.peerSub}>{canChat ? `${peer.role} chat` : 'Chat opens after a driver accepts'}</Text>
        </View>
        <TouchableOpacity style={[styles.headerBtn, !canChat && styles.headerBtnOff]} onPress={openCall} disabled={!canChat}>
          <Ionicons name="videocam-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageRow item={item} />}
          inverted
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="always"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={42} color={colors.border} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>Send a quick update about pickup, timing, or where to meet.</Text>
            </View>
          }
        />
      )}

      <View style={styles.composerWrap}>
        <Pressable style={[styles.composer, !canChat && styles.composerOff]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            editable={canChat && !sending}
            placeholder={canChat ? 'Message...' : 'Waiting for a driver'}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || !canChat || sending) && styles.sendBtnOff]}
            onPress={sendMessage}
            disabled={!draft.trim() || !canChat || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.charcoal,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerBtnOff: { opacity: 0.45 },
  avatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  headerText: { flex: 1 },
  peerName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  peerSub: { color: '#8B949E', fontSize: 12, fontWeight: '700', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 16, paddingVertical: 18, flexGrow: 1 },
  messageRow: { marginBottom: 10 },
  messageMineRow: { alignItems: 'flex-end' },
  messagePeerRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '82%', borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 9 },
  messageMine: { backgroundColor: colors.primary, borderBottomRightRadius: radius.xs },
  messagePeer: { backgroundColor: colors.white, borderBottomLeftRadius: radius.xs, ...shadows.xs },
  messageText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  messageMineText: { color: colors.white },
  messagePeerText: { color: colors.textPrimary },
  messageTime: { fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginTop: 4 },
  messageMineTime: { color: 'rgba(255,255,255,0.7)' },
  messagePeerTime: { color: colors.textTertiary },
  callNotice: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryGhost,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  callNoticeText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, transform: [{ scaleY: -1 }] },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 5 },
  composerWrap: { padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.borderLight },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    minHeight: 48,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.offWhite,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
  },
  composerOff: { opacity: 0.65 },
  input: { flex: 1, maxHeight: 110, paddingVertical: 8, fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { opacity: 0.45 },
});
