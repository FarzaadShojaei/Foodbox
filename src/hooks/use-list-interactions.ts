import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { useProtectedAction, useSession } from '@/providers/session-provider';

/**
 * Like (public) + Save (private) for a single list.
 * - Both are protected actions: a guest tapping them gets the sign-in modal.
 * - Updates are optimistic and roll back if the write fails.
 * - The public count comes from lists.like_count (kept by a DB trigger); we
 *   nudge it locally for instant feedback and reconcile on the next load.
 */
export function useListInteractions(listId: string, initialLikeCount: number) {
  const { user } = useSession();
  const runProtected = useProtectedAction();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);

  useEffect(() => {
    setLikeCount(initialLikeCount);
  }, [initialLikeCount]);

  // load the current user's like/save state for this list
  useEffect(() => {
    if (!user) {
      setLiked(false);
      setSaved(false);
      return;
    }
    let active = true;
    (async () => {
      const [{ data: likeRow }, { data: saveRow }] = await Promise.all([
        supabase
          .from('list_likes')
          .select('list_id')
          .eq('list_id', listId)
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('list_saves')
          .select('list_id')
          .eq('list_id', listId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (!active) return;
      setLiked(!!likeRow);
      setSaved(!!saveRow);
    })();
    return () => {
      active = false;
    };
  }, [user, listId]);

  function toggleLike() {
    runProtected(async () => {
      if (!user) return;
      if (liked) {
        setLiked(false);
        setLikeCount((c) => Math.max(c - 1, 0));
        const { error } = await supabase
          .from('list_likes')
          .delete()
          .eq('list_id', listId)
          .eq('user_id', user.id);
        if (error) {
          setLiked(true);
          setLikeCount((c) => c + 1);
        }
      } else {
        setLiked(true);
        setLikeCount((c) => c + 1);
        const { error } = await supabase
          .from('list_likes')
          .insert({ list_id: listId, user_id: user.id });
        if (error) {
          setLiked(false);
          setLikeCount((c) => Math.max(c - 1, 0));
        }
      }
    });
  }

  function toggleSave() {
    runProtected(async () => {
      if (!user) return;
      if (saved) {
        setSaved(false);
        const { error } = await supabase
          .from('list_saves')
          .delete()
          .eq('list_id', listId)
          .eq('user_id', user.id);
        if (error) setSaved(true);
      } else {
        setSaved(true);
        const { error } = await supabase
          .from('list_saves')
          .insert({ list_id: listId, user_id: user.id });
        if (error) setSaved(false);
      }
    });
  }

  return { liked, saved, likeCount, toggleLike, toggleSave };
}
