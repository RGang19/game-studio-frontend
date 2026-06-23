import { useCallback, useEffect, useRef, useState } from "react";
import { fetchFollowStatus, toggleFollowApi } from "@/lib/api/social";
import { getCurrentUserId } from "@/lib/identity";


/** Real follow state for a creator, persisted on the backend. */
export function useFollow(creatorId: string | null | undefined) {
  const userId = useRef(getCurrentUserId()).current;
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);

  useEffect(() => {
    if (!creatorId) return;
    let cancelled = false;
    fetchFollowStatus(creatorId, userId)
      .then((status) => {
        if (cancelled) return;
        setFollowing(status.following);
        setFollowers(status.followers);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [creatorId, userId]);

  const toggle = useCallback(async () => {
    if (!creatorId) return;
    // optimistic flip; reconciled with the server response
    setFollowing((f) => !f);
    try {
      const status = await toggleFollowApi(creatorId, userId);
      setFollowing(status.following);
      setFollowers(status.followers);
    } catch {
      setFollowing((f) => !f);
    }
  }, [creatorId, userId]);

  const isSelf = creatorId === userId;
  return { following, followers, toggle, isSelf };
}
