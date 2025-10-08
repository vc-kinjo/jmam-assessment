'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [bffStatus, setBffStatus] = useState<string>('未確認');
  const [backendStatus, setBackendStatus] = useState<string>('未確認');

  const testBFF = async () => {
    setBffStatus('確認中...');
    try {
      const response = await fetch('/api/v1/health');
      const data = await response.json();
      setBffStatus(`✅ 成功: ${JSON.stringify(data)}`);
    } catch (error) {
      setBffStatus(`❌ エラー: ${error}`);
    }
  };

  const testBackend = async () => {
    setBackendStatus('確認中...');
    try {
      const response = await fetch('http://localhost:8002/health');
      const data = await response.json();
      setBackendStatus(`✅ 成功: ${JSON.stringify(data)}`);
    } catch (error) {
      setBackendStatus(`❌ エラー: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          API接続テスト
        </h1>
        
        <div className="space-y-6">
          {/* BFF テスト */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">BFF (Backend for Frontend)</h2>
            <p className="text-gray-600 mb-4">
              URL: /api/v1/health (リライト先: http://localhost:8001/api/v1/health)
            </p>
            <button
              onClick={testBFF}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-4"
            >
              BFF接続テスト
            </button>
            <div className="bg-gray-100 p-3 rounded">
              <strong>結果:</strong> {bffStatus}
            </div>
          </div>

          {/* Backend テスト */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Backend API</h2>
            <p className="text-gray-600 mb-4">
              URL: http://localhost:8002/health
            </p>
            <button
              onClick={testBackend}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mb-4"
            >
              Backend接続テスト
            </button>
            <div className="bg-gray-100 p-3 rounded">
              <strong>結果:</strong> {backendStatus}
            </div>
          </div>

          {/* 接続状況確認 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">サービス状況確認</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-green-600 font-semibold">Frontend</div>
                <div className="text-green-800">✅ 正常動作</div>
                <div className="text-sm text-gray-600">Port: 3004</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded">
                <div className="text-yellow-600 font-semibold">BFF</div>
                <div className="text-yellow-800">⏳ 確認中</div>
                <div className="text-sm text-gray-600">Port: 8001</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded">
                <div className="text-yellow-600 font-semibold">Backend</div>
                <div className="text-yellow-800">⏳ 確認中</div>
                <div className="text-sm text-gray-600">Port: 8002</div>
              </div>
            </div>
          </div>
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