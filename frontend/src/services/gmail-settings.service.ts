import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GmailSettings } from '../types/gmail-settings';
import { getCurrentUser } from './auth.service';

const COLLECTION_NAME = 'gmail-settings';

export class GmailSettingsService {
  static async getSettings(): Promise<GmailSettings[]> {
    const settingsCollection = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(settingsCollection);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as GmailSettings));
  }

  static async createSettings(settings: Omit<GmailSettings, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<string> {
    const user = await getCurrentUser();
    if (!user) throw new Error('ユーザーが認証されていません');

    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date();
    
    const newSettings: GmailSettings = {
      ...settings,
      createdAt: now,
      updatedAt: now,
      createdBy: user.uid,
      updatedBy: user.uid
    };

    await setDoc(docRef, newSettings);
    return docRef.id;
  }

  static async updateSettings(id: string, settings: Partial<GmailSettings>): Promise<void> {
    const user = await getCurrentUser();
    if (!user) throw new Error('ユーザーが認証されていません');

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...settings,
      updatedAt: new Date(),
      updatedBy: user.uid
    });
  }

  static async deleteSettings(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  }

  // Gmailラベル一覧を取得（Gmail APIから）
  static async getGmailLabels(): Promise<{ id: string; name: string; }[]> {
    const response = await fetch('/api/gmail/labels');
    if (!response.ok) {
      throw new Error('Gmailラベルの取得に失敗しました');
    }
    return response.json();
  }

  // Googleドライブのフォルダ一覧を取得
  static async getDriveFolders(): Promise<{ id: string; name: string; }[]> {
    const response = await fetch('/api/drive/folders');
    if (!response.ok) {
      throw new Error('Googleドライブフォルダの取得に失敗しました');
    }
    return response.json();
  }
}
