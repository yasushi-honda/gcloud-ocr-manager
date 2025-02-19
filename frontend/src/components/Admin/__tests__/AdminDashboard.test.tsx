import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { AdminDashboard } from '../AdminDashboard';

describe('AdminDashboard', () => {
  it('ダッシュボードヘッダーが正しく表示されること', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('管理者ダッシュボード')).toBeInTheDocument();
  });

  it('サイドメニューの項目が正しく表示されること', () => {
    render(<AdminDashboard />);
    
    // メニュー項目の確認
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
    expect(screen.getByText('ユーザー管理')).toBeInTheDocument();
    expect(screen.getByText('ストレージ管理')).toBeInTheDocument();
    expect(screen.getByText('統計・レポート')).toBeInTheDocument();
    expect(screen.getByText('システム設定')).toBeInTheDocument();
  });

  it('概要カードが正しく表示されること', () => {
    render(<AdminDashboard />);
    
    // 各概要カードの確認
    expect(screen.getByText('総ユーザー数')).toBeInTheDocument();
    expect(screen.getByText('総ストレージ使用量')).toBeInTheDocument();
    expect(screen.getByText('処理済みファイル数')).toBeInTheDocument();
    expect(screen.getByText('今月のOCR処理数')).toBeInTheDocument();
  });

  it('システム状態が正しく表示されること', () => {
    render(<AdminDashboard />);
    
    expect(screen.getByText('システム状態')).toBeInTheDocument();
    expect(screen.getByText(/CPU使用率/)).toBeInTheDocument();
    expect(screen.getByText(/メモリ使用率/)).toBeInTheDocument();
    expect(screen.getByText(/API応答時間/)).toBeInTheDocument();
    expect(screen.getByText(/エラー率/)).toBeInTheDocument();
  });

  it('サイドメニューの開閉が正しく動作すること', () => {
    render(<AdminDashboard />);
    
    const menuButton = screen.getByLabelText('open drawer');
    
    // 初期状態ではメニューは開いている
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '240px' });
    
    // メニューを閉じる
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '0px' });
    
    // メニューを開く
    fireEvent.click(menuButton);
    expect(screen.getByRole('navigation')).toHaveStyle({ width: '240px' });
  });
});
