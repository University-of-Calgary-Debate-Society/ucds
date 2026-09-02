import React, { useState } from 'react';
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { ExecutiveLayout } from './ExecutiveLayout';
import { CustomSelect } from '@/components/common/CustomSelect';

interface PostItem {
  id: string;
  title: string;
  category: 'Announcement' | 'Motion Archive' | 'Resource Guide';
  author: string;
  date: string;
  status: 'Published' | 'Draft';
  snippet: string;
}

export const ExecutivePosts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'announcements' | 'motions' | 'create'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Form State
  const [postTitle, setPostTitle] = useState('');
  const [postCategory, setPostCategory] = useState<'Announcement' | 'Motion Archive' | 'Resource Guide'>('Announcement');
  const [postContent, setPostContent] = useState('');
  const [postPublished, setPostPublished] = useState(true);

  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 'p1',
      title: 'Fall 2026 Novice Welcome & Orientation Schedule',
      category: 'Announcement',
      author: 'President',
      date: 'Aug 28, 2026',
      status: 'Published',
      snippet: 'Welcome to the 60th season of the University of Calgary Debate Society! Here is everything you need to know about practices.',
    },
    {
      id: 'p2',
      title: 'Calgary Cup 2026 - Round 1 to Grand Finals Motion Archive',
      category: 'Motion Archive',
      author: 'VP Training',
      date: 'Aug 15, 2026',
      status: 'Published',
      snippet: 'THR the romanticization of the 9-to-5 corporate career path in mainstream cinema and media. Info slide attached.',
    },
    {
      id: 'p3',
      title: 'Guide to Comparative Economics in British Parliamentary Debate',
      category: 'Resource Guide',
      author: 'Chief Adjudicator',
      date: 'Aug 10, 2026',
      status: 'Draft',
      snippet: 'A comprehensive handbook for novice and varsity debaters tackling fiscal, monetary, and international trade motions.',
    },
  ]);

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postContent) return;

    const newPost: PostItem = {
      id: `p_${Date.now()}`,
      title: postTitle,
      category: postCategory,
      author: 'Executive Officer',
      date: 'Just now',
      status: postPublished ? 'Published' : 'Draft',
      snippet: postContent.slice(0, 140) + '...',
    };

    setPosts((prev) => [newPost, ...prev]);
    setPostTitle('');
    setPostContent('');
    setActiveTab('all');
  };

  const filteredPosts = posts.filter((p) => {
    const matchesCategory =
      activeTab === 'all' ||
      (activeTab === 'announcements' && p.category === 'Announcement') ||
      (activeTab === 'motions' && p.category === 'Motion Archive');

    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.snippet.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <ExecutiveLayout activeSection="posts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C244C] dark:text-[#F6F6F6] tracking-tight">
              Announcements & Content Posts
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
              Publish official club announcements, update tournament motion archives, and manage matter files.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="btn-exec-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Post</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#1C244C]/10 dark:border-[#53afd0]/20 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            All Content ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'announcements'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            Announcements
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('motions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'motions'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            Motion Archive
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'create'
                ? 'bg-[#1C244C] text-[#F6F6F6] dark:bg-[#0075A2]'
                : 'text-slate-600 dark:text-slate-300 hover:bg-[#1C244C]/5 dark:hover:bg-[#53afd0]/10'
            }`}
          >
            Editor & Creator
          </button>
        </div>

        {/* Content List */}
        {activeTab !== 'create' && (
          <div className="space-y-4">
            <div className="relative max-w-md flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Search posts or motions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="exec-input exec-search-input !pl-10 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPosts.map((post) => (
                <div key={post.id} className="exec-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          post.category === 'Announcement'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20'
                            : post.category === 'Motion Archive'
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                              : 'bg-[#0075A2]/10 text-[#0075A2] dark:text-[#53afd0]'
                        }`}
                      >
                        {post.category}
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          post.status === 'Published'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {post.status === 'Published' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        <span>{post.status}</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {post.snippet}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span>By {post.author} • {post.date}</span>
                    <button
                      type="button"
                      onClick={() => alert(`Editing ${post.title}`)}
                      className="text-[#0075A2] dark:text-[#53afd0] font-bold hover:underline cursor-pointer"
                    >
                      Edit Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Post Editor */}
        {activeTab === 'create' && (
          <div className="exec-card max-w-3xl mx-auto">
            <h2 className="text-lg font-bold font-sans text-[#1C244C] dark:text-[#F6F6F6] mb-4">
              Create New Website Post or Motion
            </h2>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Post Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Calgary Cup 2026 Motion Release: Round 1"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className="exec-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <CustomSelect
                    value={postCategory}
                    onChange={(val) => setPostCategory(val as 'Announcement' | 'Motion Archive' | 'Resource Guide')}
                    options={[
                      { value: 'Announcement', label: 'Announcement' },
                      { value: 'Motion Archive', label: 'Motion Archive' },
                      { value: 'Resource Guide', label: 'Resource Guide' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Content (Markdown & Info Slides Supported)
                </label>
                <textarea
                  rows={10}
                  placeholder="Write post content or motion details here..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="exec-input text-xs resize-y font-mono"
                  required
                />
              </div>

              <div className="pt-3 border-t border-[#1C244C]/10 dark:border-[#53afd0]/15 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={postPublished}
                    onChange={(e) => setPostPublished(e.target.checked)}
                    className="rounded border-slate-300 text-[#0075A2]"
                  />
                  <span>Publish immediately to website</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="btn-exec-return text-xs"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-exec-primary text-xs">
                    Save & Publish
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </ExecutiveLayout>
  );
};
