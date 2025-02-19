export interface GmailSettings {
  id?: string;
  targetLabels: string[];  // 監視対象のGmailラベル
  targetFolderId: string;  // 保存先のGoogleドライブフォルダID
  folderName: string;      // フォルダ名（表示用）
  enabled: boolean;        // 有効/無効フラグ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;      // 作成者のUID
  updatedBy: string;      // 更新者のUID
}
