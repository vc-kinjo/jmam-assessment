'use client';

import { useState } from 'react';

export default function LoginTestPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [result, setResult] = useState<string>('');

  const testLogin = async () => {
    setResult('ログイン中...');
    
    try {
      // BFF経由でログイン（シンプル版）
      const response = await fetch('http://localhost:8001/api/v1/auth/simple-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            username,
            password,
          },
          metadata: {
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(`✅ ログイン成功!\nセッションID: ${data.data?.session_id}\nユーザー: ${JSON.stringify(data.data?.user, null, 2)}`);
      } else {
        setResult(`❌ ログイン失敗: ${data.error?.message || '不明なエラー'}`);
      }
    } catch (error) {
      setResult(`❌ 接続エラー: ${error}`);
    }
  };

  const testBackendDirect = async () => {
    setResult('Backend直接テスト中...');
    
    try {
      const response = await fetch('http://localhost:8002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();
      setResult(`Backend直接レスポンス:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setResult(`❌ Backend直接接続エラー: ${error}`);
    }
  };

  const testHealthCheck = async () => {
    setResult('ヘルスチェック中...');
    
    try {
      const [bffResponse, backendResponse] = await Promise.all([
        fetch('http://localhost:8001/api/v1/auth/test-health', { mode: 'cors' }),
        fetch('http://localhost:8002/health', { mode: 'cors' })
      ]);

      const bffData = await bffResponse.json();
      const backendData = await backendResponse.json();

      setResult(`ヘルスチェック結果:
BFF: ${JSON.stringify(bffData)}
Backend: ${JSON.stringify(backendData)}`);
    } catch (error) {
      setResult(`❌ ヘルスチェックエラー: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          ログイン機能テスト
        </h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">認証情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ユーザー名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">テスト実行</h2>
          <div className="space-x-4 mb-4">
            <button
              onClick={testLogin}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              BFF経由ログイン
            </button>
            <button
              onClick={testBackendDirect}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Backend直接ログイン
            </button>
            <button
              onClick={testHealthCheck}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              ヘルスチェック
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">結果</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
            {result || '上のボタンをクリックしてテストを実行してください'}
          </pre>
        </div>

        <div className="mt-8">
          <a 
            href="/"
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ホームに戻る
          </a>
        </div>
      </div>
    </div>
  );
}