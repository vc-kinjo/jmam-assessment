'use client';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          GunChart Frontend Test
        </h1>
        <p className="text-gray-600 mb-6">
          Frontend is working! ✅
        </p>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Connection Status</h2>
          <p className="text-green-600">Next.js server is running on port 3004</p>
        </div>
      </div>
    </div>
  );
}