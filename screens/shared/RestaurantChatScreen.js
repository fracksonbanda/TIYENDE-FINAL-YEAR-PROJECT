import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { sendRestaurantMessage, watchRestaurantMessages } from '../../services/chatService';
import { colors, radius, shadows } from '../../theme';

function formatTime(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessageRow({ item }) {
  const mine = item.senderId === auth.currentUser?.uid;
  const isDriver = item.senderRole === 'driver';

  return (
    <View style={[styles.messageRow, mine ? styles.messageMineRow : styles.messagePeerRow]}>
      <View style={[styles.messageBubble, mine ? styles.messageMine : styles.messagePeer]}>
        {!mine && (
          <Text style={styles.senderLabel}>
            {isDriver ? '🚴 Driver' : '👤 Customer'}
          </Text>
        )}
        <Text style={[styles.messageText, mine ? styles.messageMineText : styles.messagePeerText]}>
          {item.body}
        </Text>
        <Text style={[styles.messageTime, mine ? styles.messageMineTime : styles.messagePeerTime]}>
          {formatTime(item.createdAtMs)}
        </Text>
      </View>
    </View>
  );
}

export default function RestaurantChatScreen({ navigation, route }) {
  const { requestId, restaurantName, senderRole = 'customer', senderName } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return watchRestaurantMessages(
      requestId,
      (items) => { setMessages(items); setLoading(false); },
      (error) => { setLoading(false); Alert.alert('Chat', error.message); },
    );
  }, [requestId]);

  const sendMessage = async () => {
    if (!draft.trim() || sending || !requestId) return;
    const text = draft;
    setDraft('');
    setSending(true);
    try {
      await sendRestaurantMessage(requestId, text, { name: senderName, role: senderRole });
    } catch (error) {
      setDraft(text);
      Alert.alert('Message Failed', error.message);
    } finally {
      setSending(false);
    }
  };

  const canSend = Boolean(requestId);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.charcoal} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.restaurantAvatar}>
          <Ionicons name="restaurant-outline" size={20} color={colors.white} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{restaurantName || 'Restaurant'}</Text>
          <Text style={styles.headerSub}>Special instructions & custom order notes</Text>
        </View>
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
              <Ionicons name="chatbubbles-outline" size={44} color={colors.border} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySub}>
                Send allergy notes, substitution requests, or any special instructions for your order.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.composerWrap}>
        <Pressable style={[styles.composer, !canSend && styles.composerOff]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            editable={canSend && !sending}
            placeholder={canSend ? 'e.g. No onions please, extra sauce on the side…' : 'Order not yet placed'}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!draft.trim() || !canSend || sending) && styles.sendBtnOff]}
            onPress={sendMessage}
            disabled={!draft.trim() || !canSend || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Ionicons name="send" size={18} color={colors.white} />}
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
  restaurantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerName: { color: colors.white, fontSize: 16, fontWeight: '900' },
  headerSub: { color: '#8B949E', fontSize: 11, fontWeight: '700', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  messageList: { paddingHorizontal: 16, paddingVertical: 18, flexGrow: 1 },
  messageRow: { marginBottom: 10 },
  messageMineRow: { alignItems: 'flex-end' },
  messagePeerRow: { alignItems: 'flex-start' },
  messageBubble: {
    maxWidth: '82%',
    borderRadius: radius.lg,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  messageMine: { backgroundColor: colors.primary, borderBottomRightRadius: radius.xs },
  messagePeer: { backgroundColor: colors.white, borderBottomLeftRadius: radius.xs, ...shadows.xs },
  senderLabel: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, marginBottom: 3 },
  messageText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  messageMineText: { color: colors.white },
  messagePeerText: { color: colors.textPrimary },
  messageTime: { fontSize: 10, fontWeight: '700', alignSelf: 'flex-end', marginTop: 4 },
  messageMineTime: { color: 'rgba(255,255,255,0.7)' },
  messagePeerTime: { color: colors.textTertiary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
    transform: [{ scaleY: -1 }],
  },
  emptyTitle: { fontSize: 17, fontWeight: '900', color: colors.textPrimary, marginTop: 14 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: 6 },
  composerWrap: {
    padding: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
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
  input: {
    flex: 1,
    maxHeight: 110,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { opacity: 0.45 },
});
