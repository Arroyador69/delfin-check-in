'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  meta_description: string;
  meta_keywords: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  conversion_count: number;
}

export default function BlogManagerPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    title: '',
    excerpt: '',
    meta_description: '',
    meta_keywords: '',
    content: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    is_published: false
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog/articles');
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.articles);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleTitleBlur = () => {
    if (formData.title && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: generateSlug(formData.title) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const url = editingArticle ? '/api/blog/articles' : '/api/blog/articles';
      const method = editingArticle ? 'PUT' : 'POST';
      const body = editingArticle ? { id: editingArticle.id, ...formData } : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message || 'Artículo guardado correctamente' });
        setShowForm(false);
        setEditingArticle(null);
        resetForm();
        fetchArticles();
      } else {
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar el artículo' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt || '',
      meta_description: article.meta_description || '',
      meta_keywords: article.meta_keywords || '',
      content: article.content,
      status: article.status,
      is_published: article.is_published
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar el artículo "${title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/articles?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Artículo eliminado correctamente' });
        fetchArticles();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al eliminar el artículo' });
    }
  };

  const resetForm = () => {
    setFormData({
      slug: '',
      title: '',
      excerpt: '',
      meta_description: '',
      meta_keywords: '',
      content: '',
      status: 'draft',
      is_published: false
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingArticle(null);
    resetForm();
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando artículos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📝 Gestión de Artículos</h1>
            <p className="text-gray-700 mt-2">Crear, editar y publicar artículos del blog</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              ➕ Crear Artículo
            </button>
          )}
        </div>
      </div>

      {/* Mensaje */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingArticle ? '✏️ Editar Artículo' : '➕ Crear Nuevo Artículo'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título y Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  onBlur={handleTitleBlur}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título del artículo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  required
                  disabled={!!editingArticle}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="url-del-articulo"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL: delfincheckin.com/articulos/{formData.slug || 'slug'}
                </p>
              </div>
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meta Descripción (SEO) *
              </label>
              <textarea
                name="meta_description"
                value={formData.meta_description}
                onChange={handleInputChange}
                required
                rows={2}
                maxLength={160}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descripción breve para SEO (máx. 160 caracteres)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.meta_description.length}/160 caracteres
              </p>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Palabras Clave (separadas por comas)
              </label>
              <input
                type="text"
                name="meta_keywords"
                value={formData.meta_keywords}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="alquiler vacacional, registro viajeros, multas ses"
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Extracto (resumen breve)
              </label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Resumen breve del artículo para listados"
              />
            </div>

            {/* Contenido */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contenido (HTML) *
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="<h2>Título de sección</h2><p>Contenido...</p>"
              />
              <p className="text-xs text-gray-500 mt-1">
                Escribe el contenido en HTML. Puedes usar h2, h3, p, ul, ol, strong, em, blockquote, etc.
              </p>
            </div>

            {/* Estado y Publicación */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-3 text-sm font-semibold text-gray-700">
                    Publicar artículo (visible públicamente)
                  </span>
                </label>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '⏳ Guardando...' : (editingArticle ? '💾 Actualizar' : '💾 Crear Artículo')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Artículos */}
      {!showForm && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Título</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Estado</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Visitas</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Conversiones</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Fecha</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {articles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      No hay artículos aún. ¡Crea el primero!
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => (
                    <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900">{article.title}</div>
                        <div className="text-sm text-gray-500">/articulos/{article.slug}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          article.is_published 
                            ? 'bg-green-100 text-green-800'
                            : article.status === 'archived'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {article.is_published ? '✅ Publicado' : article.status === 'archived' ? '📦 Archivado' : '📝 Borrador'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-semibold">{article.view_count || 0}</td>
                      <td className="py-4 px-6 font-semibold text-green-600">{article.conversion_count || 0}</td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {article.published_at 
                          ? new Date(article.published_at).toLocaleDateString('es-ES')
                          : new Date(article.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleEdit(article)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold"
                          >
                            ✏️ Editar
                          </button>
                          {article.is_published && (
                            <a
                              href={`https://delfincheckin.com/articulos/${article.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold"
                            >
                              👁️ Ver
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(article.id, article.title)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-semibold"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Links de navegación */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/superadmin/blog-analytics"
          className="inline-block px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold"
        >
          📊 Ver Analytics de Artículos
        </Link>
        <Link
          href="/superadmin"
          className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
