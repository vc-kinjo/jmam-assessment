'use client';

import React, { useState, useEffect } from 'react';
import { ValidPredecessorTask, DEPENDENCY_TYPES } from '@/types/task';
import { TaskService } from '@/services/taskService';

interface PredecessorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (predecessorId: number, dependencyType: string, lagDays: number) => void;
  taskId: number;
  taskName: string;
}

export const PredecessorSelectionModal: React.FC<PredecessorSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  taskId,
  taskName
}) => {
  const [validPredecessors, setValidPredecessors] = useState<ValidPredecessorTask[]>([]);
  const [selectedPredecessor, setSelectedPredecessor] = useState<number | null>(null);
  const [dependencyType, setDependencyType] = useState('finish_to_start');
  const [lagDays, setLagDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && taskId) {
      loadValidPredecessors();
    }
  }, [isOpen, taskId]);

  const loadValidPredecessors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await TaskService.getValidPredecessors(taskId);
      setValidPredecessors(response);
    } catch (err) {
      setError('先行タスク一覧の取得に失敗しました');
      console.error('Failed to load valid predecessors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPredecessor) {
      onSelect(selectedPredecessor, dependencyType, lagDays);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedPredecessor(null);
    setDependencyType('finish_to_start');
    setLagDays(0);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleClose}></div>
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">先行タスクを選択</h2>
            <p className="text-sm text-gray-600 mt-1">
              {taskName} の先行タスクを設定します
            </p>
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div className="px-6 py-4">
            {loading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-600">読み込み中...</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && (
              <>
                {validPredecessors.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m8-8v2m0 0V4m0 3h3m-3 0h-3" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      選択可能な先行タスクがありません
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      同じグループ内に先行タスクとして設定できるタスクがありません。
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 先行タスク選択 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        先行タスク <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {validPredecessors.map((predecessor) => (
                          <label
                            key={predecessor.id}
                            className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="predecessor"
                              value={predecessor.id}
                              checked={selectedPredecessor === predecessor.id}
                              onChange={() => setSelectedPredecessor(predecessor.id)}
                              className="mr-3 text-blue-600"
                            />
                            <div className="flex-1">
                              <div 
                                className="text-sm font-medium text-gray-900"
                                style={{ paddingLeft: `${predecessor.level * 16}px` }}
                              >
                                {predecessor.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                レベル {predecessor.level}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 依存関係タイプ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        依存関係タイプ
                      </label>
                      <select
                        value={dependencyType}
                        onChange={(e) => setDependencyType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {DEPENDENCY_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* ラグ日数 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ラグ日数
                      </label>
                      <input
                        type="number"
                        value={lagDays}
                        onChange={(e) => setLagDays(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        正の値で遅延、負の値で前倒しを指定
                      </p>
                    </div>

                    {/* ボタン */}
                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedPredecessor}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        設定
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};