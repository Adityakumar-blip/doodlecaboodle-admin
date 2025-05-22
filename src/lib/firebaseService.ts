
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  DocumentData
} from "firebase/firestore";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage";
import { db, storage } from "./firebase";
import { Artwork, Collection, Event, ContactMessage } from "@/types";

// Helper function to convert Firestore data to our types
const convertTimestamps = (data: DocumentData) => {
  const result = { ...data };
  
  Object.keys(result).forEach((key) => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    }
  });
  
  return result;
};

// Artworks
export const getArtworks = async (): Promise<Artwork[]> => {
  const artworksCollection = collection(db, "artworks");
  const q = query(artworksCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<Artwork, 'id'>
  }));
};

export const getArtwork = async (id: string): Promise<Artwork | null> => {
  const docRef = doc(db, "artworks", id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()) as Omit<Artwork, 'id'>
    };
  }
  
  return null;
};

export const addArtwork = async (artwork: Omit<Artwork, 'id' | 'createdAt'>): Promise<string> => {
  const artworkData = {
    ...artwork,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, "artworks"), artworkData);
  return docRef.id;
};

export const updateArtwork = async (id: string, artwork: Partial<Artwork>): Promise<void> => {
  const artworkRef = doc(db, "artworks", id);
  await updateDoc(artworkRef, artwork);
};

export const deleteArtwork = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "artworks", id));
};

// Collections
export const getCollections = async (): Promise<Collection[]> => {
  const collectionsCollection = collection(db, "collections");
  const q = query(collectionsCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<Collection, 'id'>
  }));
};

export const getCollection = async (id: string): Promise<Collection | null> => {
  const docRef = doc(db, "collections", id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()) as Omit<Collection, 'id'>
    };
  }
  
  return null;
};

export const addCollection = async (collectionData: Omit<Collection, 'id' | 'createdAt'>): Promise<string> => {
  const data = {
    ...collectionData,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, "collections"), data);
  return docRef.id;
};

export const updateCollection = async (id: string, collection: Partial<Collection>): Promise<void> => {
  const collectionRef = doc(db, "collections", id);
  await updateDoc(collectionRef, collection);
};

export const deleteCollection = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "collections", id));
};

// Events
export const getEvents = async (): Promise<Event[]> => {
  const eventsCollection = collection(db, "events");
  const q = query(eventsCollection, orderBy("startDate", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<Event, 'id'>
  }));
};

export const getEvent = async (id: string): Promise<Event | null> => {
  const docRef = doc(db, "events", id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()) as Omit<Event, 'id'>
    };
  }
  
  return null;
};

export const getArtworksByCategory = async (category: string): Promise<Artwork[]> => {
  const artworksCollection = collection(db, "artworks");
  const q = query(
    artworksCollection, 
    where("category", "==", category),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<Artwork, 'id'>
  }));
};

export const getCollectionsByType = async (type: string): Promise<Collection[]> => {
  const collectionsRef = collection(db, "collections");
  const q = query(
    collectionsRef, 
    where("type", "==", type),
    orderBy("createdAt", "desc")
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<Collection, 'id'>
  }));
};

export const getUserByEmail = async (email: string): Promise<any | null> => {
  if (!email) return null;
  
  const usersCollection = collection(db, "users");
  const q = query(usersCollection, where("email", "==", email));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const userDoc = querySnapshot.docs[0];
  return {
    id: userDoc.id,
    ...convertTimestamps(userDoc.data()) as Omit<any, 'id'>
  };
};

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  if (!userId) return;
  
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    lastLogin: serverTimestamp()
  });
};

export const addEvent = async (event: Omit<Event, 'id' | 'createdAt'>): Promise<string> => {
  const eventData = {
    ...event,
    createdAt: serverTimestamp()
  };
  
  const docRef = await addDoc(collection(db, "events"), eventData);
  return docRef.id;
};

export const updateEvent = async (id: string, event: Partial<Event>): Promise<void> => {
  const eventRef = doc(db, "events", id);
  await updateDoc(eventRef, event);
};

export const deleteEvent = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "events", id));
};

// Contact Messages
export const getContactMessages = async (): Promise<ContactMessage[]> => {
  const messagesCollection = collection(db, "contactMessages");
  const q = query(messagesCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<ContactMessage, 'id'>
  }));
};

export const getUnreadMessages = async (): Promise<ContactMessage[]> => {
  const messagesCollection = collection(db, "contactMessages");
  const q = query(
    messagesCollection, 
    where("read", "==", false),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...convertTimestamps(doc.data()) as Omit<ContactMessage, 'id'>
  }));
};

export const getContactMessage = async (id: string): Promise<ContactMessage | null> => {
  const docRef = doc(db, "contactMessages", id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data()) as Omit<ContactMessage, 'id'>
    };
  }
  
  return null;
};

export const markMessageAsRead = async (id: string): Promise<void> => {
  const messageRef = doc(db, "contactMessages", id);
  await updateDoc(messageRef, { read: true });
};

export const deleteContactMessage = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, "contactMessages", id));
};

// File uploads
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, `${path}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const deleteImage = async (imageUrl: string): Promise<void> => {
  // Extract the path from the URL
  const urlPath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
  const imageRef = ref(storage, urlPath);
  await deleteObject(imageRef);
};

// Dashboard stats
export const getDashboardStats = async () => {
  const artworks = await getArtworks();
  const collections = await getCollections();
  const events = await getEvents();
  const unreadMessages = await getUnreadMessages();
  
  return {
    totalArtworks: artworks.length,
    totalCollections: collections.length,
    totalEvents: events.length,
    unreadMessages: unreadMessages.length
  };
};
