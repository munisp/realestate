/**
 * Innovation 8: Collaborative Wishlist with Real-Time Co-Browsing
 * Shared property lists with live cursor presence and comment threads
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Collaborator { id: string; name: string; color: string; isOnline: boolean; cursor?: { x: number; y: number }; }
interface WishlistItem { id: string; propertyId: string; title: string; price: number; imageUrl: string; location: string; addedBy: string; votes: Record<string, 'up' | 'down'>; comments: Comment[]; }
interface Comment { id: string; userId: string; userName: string; text: string; timestamp: Date; }

const COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899'];

interface CollaborativeWishlistProps {
  wishlistId?: string;
  currentUserId?: string;
  currentUserName?: string;
  onInvite?: (email: string) => void;
}

export function CollaborativeWishlist({ wishlistId = 'demo', currentUserId = 'user-1', currentUserName = 'You', onInvite }: CollaborativeWishlistProps) {
  const [items, setItems] = useState<WishlistItem[]>([
    { id: '1', propertyId: 'p1', title: '3-Bed Apartment, Lekki Phase 1', price: 45_000_000, imageUrl: 'https://picsum.photos/seed/1/300/200', location: 'Lekki, Lagos', addedBy: 'user-1', votes: { 'user-1': 'up', 'user-2': 'up' }, comments: [{ id: 'c1', userId: 'user-2', userName: 'Sarah', text: 'Love the location! Near the beach 🏖', timestamp: new Date(Date.now() - 3600000) }] },
    { id: '2', propertyId: 'p2', title: '4-Bed Duplex, Maitama', price: 120_000_000, imageUrl: 'https://picsum.photos/seed/2/300/200', location: 'Maitama, Abuja', addedBy: 'user-2', votes: { 'user-1': 'down', 'user-2': 'up', 'user-3': 'up' }, comments: [] },
  ]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    { id: 'user-1', name: 'You', color: COLORS[0], isOnline: true },
    { id: 'user-2', name: 'Sarah', color: COLORS[1], isOnline: true },
    { id: 'user-3', name: 'Emeka', color: COLORS[2], isOnline: false },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [sortBy, setSortBy] = useState<'votes' | 'added' | 'price'>('votes');
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulate collaborator cursor movement
  useEffect(() => {
    const interval = setInterval(() => {
      setCollaborators(prev => prev.map(c =>
        c.id !== currentUserId && c.isOnline
          ? { ...c, cursor: { x: Math.random() * 100, y: Math.random() * 100 } }
          : c
      ));
    }, 2000);
    return () => clearInterval(interval);
  }, [currentUserId]);

  const vote = useCallback((itemId: string, direction: 'up' | 'down') => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newVotes = { ...item.votes };
      if (newVotes[currentUserId] === direction) delete newVotes[currentUserId];
      else newVotes[currentUserId] = direction;
      return { ...item, votes: newVotes };
    }));
  }, [currentUserId]);

  const addComment = useCallback((itemId: string) => {
    if (!commentText.trim()) return;
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, comments: [...item.comments, { id: Date.now().toString(), userId: currentUserId, userName: currentUserName, text: commentText, timestamp: new Date() }] };
    }));
    setCommentText('');
    setActiveComment(null);
  }, [commentText, currentUserId, currentUserName]);

  const getScore = (item: WishlistItem) => Object.values(item.votes).reduce((s, v) => s + (v === 'up' ? 1 : -1), 0);

  const sorted = [...items].sort((a, b) => {
    if (sortBy === 'votes') return getScore(b) - getScore(a);
    if (sortBy === 'price') return a.price - b.price;
    return 0;
  });

  const formatPrice = (n: number) => `₦${(n / 1_000_000).toFixed(1)}M`;

  return (
    <div ref={containerRef} className="relative space-y-4">
      {/* Live cursors overlay */}
      {collaborators.filter(c => c.id !== currentUserId && c.isOnline && c.cursor).map(c => (
        <motion.div
          key={c.id}
          className="fixed pointer-events-none z-50 flex items-center gap-1"
          animate={{ left: `${c.cursor!.x}%`, top: `${c.cursor!.y}%` }}
          transition={{ type: 'spring', damping: 20 }}
          aria-hidden="true"
        >
          <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: c.color }} />
          <span className="text-xs font-medium bg-white/90 px-1.5 py-0.5 rounded shadow" style={{ color: c.color }}>{c.name}</span>
        </motion.div>
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Our Wishlist</h2>
          <p className="text-xs text-muted-foreground">{items.length} properties · {collaborators.filter(c => c.isOnline).length} online</p>
        </div>
        <div className="flex -space-x-2">
          {collaborators.map(c => (
            <div key={c.id} className="relative" title={`${c.name} ${c.isOnline ? '(online)' : '(offline)'}`}>
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarFallback style={{ background: c.color, color: 'white', fontSize: '0.7rem' }}>
                  {c.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {c.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>

      {/* Invite */}
      <div className="flex gap-2">
        <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Invite by email..." className="text-sm" aria-label="Invite collaborator by email" />
        <Button size="sm" onClick={() => { onInvite?.(inviteEmail); setInviteEmail(''); }} disabled={!inviteEmail}>Invite</Button>
      </div>

      {/* Sort */}
      <div className="flex gap-2" role="group" aria-label="Sort wishlist">
        {[['votes', 'Top Voted'], ['price', 'Price'], ['added', 'Recent']] .map(([key, label]) => (
          <button key={key} onClick={() => setSortBy(key as typeof sortBy)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${sortBy === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            aria-pressed={sortBy === key}>{label}</button>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        <AnimatePresence>
          {sorted.map(item => {
            const score = getScore(item);
            const myVote = item.votes[currentUserId];
            return (
              <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-xl border bg-card overflow-hidden">
                <div className="flex gap-3 p-3">
                  <img src={item.imageUrl} alt={item.title} className="w-20 h-16 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.location}</p>
                    <p className="font-bold text-primary text-sm mt-0.5">{formatPrice(item.price)}</p>
                  </div>
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button onClick={() => vote(item.id, 'up')} aria-label="Upvote" aria-pressed={myVote === 'up'}
                      className={`text-lg leading-none transition-transform hover:scale-125 ${myVote === 'up' ? 'text-green-500' : 'text-muted-foreground'}`}>▲</button>
                    <span className={`text-sm font-bold ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{score}</span>
                    <button onClick={() => vote(item.id, 'down')} aria-label="Downvote" aria-pressed={myVote === 'down'}
                      className={`text-lg leading-none transition-transform hover:scale-125 ${myVote === 'down' ? 'text-red-500' : 'text-muted-foreground'}`}>▼</button>
                  </div>
                </div>

                {/* Comments */}
                {item.comments.length > 0 && (
                  <div className="px-3 pb-2 space-y-1.5 border-t pt-2">
                    {item.comments.map(c => (
                      <div key={c.id} className="flex gap-2 text-xs">
                        <span className="font-semibold text-primary shrink-0">{c.userName}:</span>
                        <span className="text-muted-foreground">{c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <div className="px-3 pb-3">
                  {activeComment === item.id ? (
                    <div className="flex gap-2 mt-2">
                      <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Add a comment..." className="text-xs h-8"
                        onKeyDown={e => e.key === 'Enter' && addComment(item.id)} aria-label="Add comment" />
                      <Button size="sm" className="h-8 text-xs" onClick={() => addComment(item.id)}>Post</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setActiveComment(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveComment(item.id)} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1">
                      + Add comment
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CollaborativeWishlist;
