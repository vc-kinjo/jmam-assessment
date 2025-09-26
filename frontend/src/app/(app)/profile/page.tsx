'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types/user';
import { apiService } from '@/services/apiService';
import { format as formatDate } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProfileStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  total_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // 編集用フォーム状態
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    full_name: '',
    bio: '',
    position: '',
    phone: '',
    notification_settings: {
      email_notifications: true,
      push_notifications: true,
      task_reminders: true,
      project_updates: true
    }
  });

  // ユーザー情報とステータスを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 現在のユーザー情報を取得
        const currentUser = await apiService.getCurrentUser();
        setUser(currentUser);
        
        // 編集フォームに現在の値を設定
        setEditData({
          username: currentUser.username,
          email: currentUser.email,
          full_name: currentUser.full_name || '',
          bio: currentUser.bio || '',
          position: currentUser.position || '',
          phone: currentUser.phone || '',
          notification_settings: currentUser.notification_settings || {
            email_notifications: true,
            push_notifications: true,
            task_reminders: true,
            project_updates: true
          }
        });
        
        // TODO: ユーザー統計を取得するAPIエンドポイントを実装
        // 現在は仮データを設定
        setStats({
          total_projects: 12,
          active_projects: 8,
          completed_projects: 4,
          total_tasks: 156,
          completed_tasks: 134,
          overdue_tasks: 3
        });
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // フォーム入力の更新
  const handleInputChange = (field: string, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  // 通知設定の更新
  const handleNotificationChange = (setting: string, value: boolean) => {
    setEditData(prev => ({
      ...prev,
      notification_settings: {
        ...prev.notification_settings,
        [setting]: value
      }
    }));
  };

  // プロフィール更新
  const handleSaveProfile = async () => {
    try {
      setUpdating(true);
      setError(null);
      
      const updatedUser = await apiService.updateUser(user!.id, {
        username: editData.username,
        email: editData.email,
        full_name: editData.full_name,
        bio: editData.bio,
        position: editData.position,
        phone: editData.phone,
        notification_settings: editData.notification_settings
      });
      
      setUser(updatedUser);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // 編集キャンセル
  const handleCancelEdit = () => {
    if (user) {
      setEditData({
        username: user.username,
        email: user.email,
        full_name: user.full_name || '',
        bio: user.bio || '',
        position: user.position || '',
        phone: user.phone || '',
        notification_settings: user.notification_settings || {
          email_notifications: true,
          push_notifications: true,
          task_reminders: true,
          project_updates: true
        }
      });
    }
    setIsEditing(false);
    setError(null);
  };

  // パスワード変更
  const handleChangePassword = () => {
    // TODO: パスワード変更モーダルの実装
    console.log('パスワード変更');
  };

  // アカウント削除
  const handleDeleteAccount = () => {
    // TODO: アカウント削除確認モーダルの実装
    console.log('アカウント削除');
  };

  if (loading) {
    return (
      <div className="profile-page min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-300 rounded mb-4"></div>
                <div className="space-y-4">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i}>
                      <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
                      <div className="h-10 bg-gray-300 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-lg p-6">
                <div className="h-6 bg-gray-300 rounded mb-4"></div>
                <div className="space-y-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="profile-page min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">エラーが発生しました</h3>
            <p className="text-red-600 mb-4">{error || 'ユーザー情報を取得できませんでした'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">プロフィール</h1>
                <p className="text-gray-600 mt-1">アカウント情報と設定を管理</p>
              </div>
            </div>
            
            {/* 編集・保存ボタン */}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>編集</span>
              </button>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={updating}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>保存</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">基本情報</h2>
              
              <div className="space-y-6">
                {/* プロフィール画像 */}
                <div className="flex items-center space-x-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-semibold text-blue-600">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {isEditing && (
                    <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                      画像を変更
                    </button>
                  )}
                </div>

                {/* フォーム */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ユーザー名 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ユーザー名 *</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editData.username}
                        onChange={(e) => handleInputChange('username', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-900">{user.username}</div>
                    )}
                  </div>

                  {/* メールアドレス */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス *</label>
                    {isEditing ? (
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-900">{user.email}</div>
                    )}
                  </div>

                  {/* フルネーム */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">フルネーム</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editData.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-900">{user.full_name || '-'}</div>
                    )}
                  </div>

                  {/* 職位 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">職位</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editData.position}
                        onChange={(e) => handleInputChange('position', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-900">{user.position || '-'}</div>
                    )}
                  </div>

                  {/* 電話番号 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-900">{user.phone || '-'}</div>
                    )}
                  </div>

                  {/* 自己紹介 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">自己紹介</label>
                    {isEditing ? (
                      <textarea
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                      />
                    ) : (
                      <div className="text-gray-900">{user.bio || '-'}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 通知設定 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">通知設定</h2>
              
              <div className="space-y-4">
                {[
                  { key: 'email_notifications', label: 'メール通知', description: '重要な更新をメールで受け取る' },
                  { key: 'push_notifications', label: 'プッシュ通知', description: 'ブラウザでプッシュ通知を受け取る' },
                  { key: 'task_reminders', label: 'タスクリマインダー', description: '期限が近いタスクの通知を受け取る' },
                  { key: 'project_updates', label: 'プロジェクト更新', description: 'プロジェクトの変更通知を受け取る' }
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{setting.label}</div>
                      <div className="text-sm text-gray-600">{setting.description}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={editData.notification_settings[setting.key as keyof typeof editData.notification_settings]}
                        onChange={(e) => handleNotificationChange(setting.key, e.target.checked)}
                        disabled={!isEditing}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* セキュリティ */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">セキュリティ</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">パスワード</div>
                    <div className="text-sm text-gray-600">最後の変更: 2024年1月15日</div>
                  </div>
                  <button
                    onClick={handleChangePassword}
                    className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    変更
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">2段階認証</div>
                    <div className="text-sm text-gray-600">追加のセキュリティ層を有効にする</div>
                  </div>
                  <button className="px-4 py-2 text-green-600 hover:text-green-800 font-medium">
                    有効化
                  </button>
                </div>
              </div>
            </div>

            {/* 危険操作 */}
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-900 mb-6">危険操作</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900">アカウントを削除</h3>
                    <p className="text-sm text-red-700 mt-1">
                      アカウントを削除すると、すべてのデータが永続的に失われます。この操作は元に戻せません。
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      アカウントを削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* アカウント情報 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ユーザーID:</span>
                  <span className="font-medium">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">権限:</span>
                  <span className="font-medium">
                    {user.role === 'admin' ? '管理者' : 
                     user.role === 'manager' ? 'マネージャー' : 'メンバー'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">登録日:</span>
                  <span className="font-medium">
                    {formatDate(new Date(user.created_at), 'yyyy/MM/dd', { locale: ja })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最終ログイン:</span>
                  <span className="font-medium">
                    {user.last_login ? formatDate(new Date(user.last_login), 'yyyy/MM/dd HH:mm', { locale: ja }) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ステータス:</span>
                  <span className={`font-medium ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {user.is_active ? 'アクティブ' : '無効'}
                  </span>
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            {stats && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">アクティビティ統計</h3>
                
                <div className="space-y-4">
                  {/* プロジェクト統計 */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">プロジェクト</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">総数:</span>
                        <span className="font-medium">{stats.total_projects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">進行中:</span>
                        <span className="font-medium text-blue-600">{stats.active_projects}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">完了:</span>
                        <span className="font-medium text-green-600">{stats.completed_projects}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">タスク</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">総数:</span>
                        <span className="font-medium">{stats.total_tasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">完了:</span>
                        <span className="font-medium text-green-600">{stats.completed_tasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">期限超過:</span>
                        <span className="font-medium text-red-600">{stats.overdue_tasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">完了率:</span>
                        <span className="font-medium">
                          {Math.round((stats.completed_tasks / Math.max(stats.total_tasks, 1)) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}