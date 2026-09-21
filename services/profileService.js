import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';

export function watchUserProfile(uid, onChange, onError) {
  if (!uid) return () => {};
  return onSnapshot(doc(db, 'users', uid), (snapshot) => {
    const currentUser = auth.currentUser;
    onChange({
      id: uid,
      email: currentUser?.email || '',
      phoneNumber: currentUser?.phoneNumber || '',
      displayName: currentUser?.displayName || '',
      photoURL: currentUser?.photoURL || '',
      ...(snapshot.exists() ? snapshot.data() : {}),
    });
  }, onError);
}

export async function saveUserProfile(updates) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to sign in first.');

  await setDoc(doc(db, 'users', user.uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  const authUpdates = {};
  if (updates.fullName) authUpdates.displayName = updates.fullName;
  if (updates.photoURL) authUpdates.photoURL = updates.photoURL;
  if (Object.keys(authUpdates).length > 0) {
    await updateProfile(user, authUpdates);
  }
}

export async function pickProfileImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to upload a profile picture.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.75,
  });

  if (result.canceled) return null;
  return result.assets?.[0]?.uri || null;
}

export async function uploadProfileImage(uri) {
  const user = auth.currentUser;
  if (!user) throw new Error('You need to sign in first.');
  if (!uri) return null;

  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('Network error while reading image'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
  const imageRef = ref(storage, `profilePhotos/${user.uid}/${Date.now()}.jpg`);
  await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
  const photoURL = await getDownloadURL(imageRef);

  await saveUserProfile({ photoURL });
  return photoURL;
}

export async function pickAndUploadProfileImage() {
  const uri = await pickProfileImage();
  if (!uri) return null;
  return uploadProfileImage(uri);
}
