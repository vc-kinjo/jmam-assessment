import React, { useState } from 'react';
import { TEMPLATE_CATEGORIES, PREDEFINED_TEMPLATES } from '../../types/template';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: any) => void;
  className?: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // フィルタリングされたテンプレート
  const filteredTemplates = PREDEFINED_TEMPLATES.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className={`template-selector fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="modal-content bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 h-5/6 flex flex-col">
        {/* ヘッダー */}
        <div className="modal-header flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">プロジェクトテンプレート</h2>
            <p className="text-gray-600 mt-1">テンプレートを選択してプロジェクトを素早く開始</p>
          </div>
          <button
            className="close-button text-gray-400 hover:text-gray-600 p-2"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* フィルター・検索エリア */}
        <div className="filter-area p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between space-x-4">
            {/* 検索 */}
            <div className="search-box flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="テンプレートを検索..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* カテゴリフィルター */}
            <div className="category-filter">
              <select
                className="px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">すべてのカテゴリ</option>
                {TEMPLATE_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 表示切り替え */}
            <div className="view-toggle flex bg-gray-200 rounded-lg p-1">
              <button
                className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-white shadow' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-white shadow' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* テンプレート一覧 */}
        <div className="template-list flex-1 p-6 overflow-y-auto">
          {filteredTemplates.length === 0 ? (
            <div className="empty-state text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">該当するテンプレートが見つかりません</p>
              <p className="text-gray-400 text-sm mt-2">検索条件を変更してお試しください</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
              {filteredTemplates.map((template, index) => (
                <div
                  key={index}
                  className={`template-card cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    viewMode === 'grid'
                      ? 'bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300'
                      : 'bg-white border border-gray-200 rounded-lg p-4 flex items-center space-x-4 hover:border-blue-300'
                  }`}
                  onClick={() => onSelect(template)}
                >
                  {viewMode === 'grid' ? (
                    <div>
                      {/* カテゴリバッジ */}
                      <div className="category-badge mb-3">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                        </span>
                      </div>

                      {/* テンプレート名 */}
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{template.name}</h3>

                      {/* 説明 */}
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>

                      {/* タグ */}
                      <div className="tags flex flex-wrap gap-2 mb-4">
                        {template.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{template.tags.length - 3}</span>
                        )}
                      </div>

                      {/* 統計 */}
                      <div className="stats flex items-center justify-between text-sm text-gray-500">
                        <span>{template.tasks.length}個のタスク</span>
                        <div className="flex items-center space-x-2">
                          <span>期間: {Math.max(...template.tasks.map(t => t.start_offset_days + t.duration_days))}日</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* アイコン */}
                      <div className="template-icon flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>

                      {/* 情報 */}
                      <div className="template-info flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">{template.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{template.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span>{template.tasks.length}個のタスク</span>
                          <span>期間: {Math.max(...template.tasks.map(t => t.start_offset_days + t.duration_days))}日</span>
                        </div>
                      </div>

                      {/* カテゴリ */}
                      <div className="template-category">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {TEMPLATE_CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="modal-footer flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            className="px-6 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            onClick={onClose}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;