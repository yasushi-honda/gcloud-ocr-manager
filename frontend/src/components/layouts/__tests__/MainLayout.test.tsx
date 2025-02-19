import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { MainLayout } from '../MainLayout';

describe('MainLayout', () => {
  it('ヘッダーが正しく表示されること', () => {
    render(<MainLayout />);
    
    expect(screen.getByText('ファイル管理システム')).toBeInTheDocument();
  });

  it('サイドメニューの開閉が正しく動作すること', () => {
    render(<MainLayout />);
    
    // メニューボタンを取得
    const menuButton = screen.getByLabelText('open drawer');
    
    // 初期状態ではメニューは閉じている
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '0px' });
    
    // メニューを開く
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '240px' });
    
    // メニューを閉じる
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '0px' });
  });

  it('サイドメニューの項目が正しく表示されること', () => {
    render(<MainLayout />);
    
    // メニュー項目の確認
    expect(screen.getByText('ファイル一覧')).toBeInTheDocument();
    expect(screen.getByText('検索')).toBeInTheDocument();
    expect(screen.getByText('設定')).toBeInTheDocument();
  });

  it('メインコンテンツエリアが正しく表示されること', () => {
    render(<MainLayout />);
    
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveStyle({ padding: '24px' });
  });
});
