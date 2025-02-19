import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { FileExplorer } from '../FileExplorer';
import { mockFiles } from '../../../test/utils';

describe('FileExplorer', () => {
  it('ファイル一覧が正しく表示されること', () => {
    render(<FileExplorer />);
    
    // ファイル名が表示されていることを確認
    mockFiles.forEach(file => {
      expect(screen.getByText(file.name)).toBeInTheDocument();
    });
  });

  it('検索機能が正しく動作すること', () => {
    render(<FileExplorer />);
    
    const searchInput = screen.getByPlaceholderText('ファイルを検索...');
    fireEvent.change(searchInput, { target: { value: '請求書' } });

    // 検索結果が正しく表示されることを確認
    expect(screen.getByText('請求書フォルダ')).toBeInTheDocument();
    expect(screen.queryByText('test-document.pdf')).not.toBeInTheDocument();
  });

  it('表示モードの切り替えが正しく動作すること', () => {
    render(<FileExplorer />);
    
    // 初期状態はグリッドビュー
    expect(screen.getByRole('grid')).toBeInTheDocument();

    // リストビューに切り替え
    const listViewButton = screen.getByLabelText('リストビュー');
    fireEvent.click(listViewButton);

    // リストビューに切り替わったことを確認
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('ファイルメニューが正しく動作すること', () => {
    render(<FileExplorer />);
    
    // メニューを開く
    const menuButton = screen.getAllByLabelText('ファイルメニュー')[0];
    fireEvent.click(menuButton);

    // メニュー項目が表示されることを確認
    expect(screen.getByText('開く')).toBeInTheDocument();
    expect(screen.getByText('ダウンロード')).toBeInTheDocument();
    expect(screen.getByText('名前を変更')).toBeInTheDocument();
    expect(screen.getByText('削除')).toBeInTheDocument();
  });
});
