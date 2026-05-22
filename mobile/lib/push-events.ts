/**
 * In-process pub/sub for foreground push receipts.
 *
 * `_layout.tsx` wires `Notifications.addNotificationReceivedListener` once at
 * app startup and emits the corresponding event type here. Screens that show
 * data which a push implies has changed (owner home: new bids; shop feed: new
 * requests) subscribe and refetch.
 *
 * Only fires while the app is foregrounded — on background/cold start the
 * normal `useFocusEffect(load)` already runs when the user returns.
 */

export type PushEventType =
  | "BID"      // shop placed a bid on owner's post
  | "ACCEPT"   // owner accepted a shop's bid
  | "CHAT"     // chat message arrived
  | "REPAIR"   // new repair request near shop
  | "PARTS"    // new parts request near shop
  | "TOWING";  // urgent towing request near shop

type Handler = () => void;

const handlers = new Map<PushEventType, Set<Handler>>();

export const pushEvents = {
  on(type: PushEventType, handler: Handler): () => void {
    let set = handlers.get(type);
    if (!set) {
      set = new Set();
      handlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  },

  emit(type: PushEventType): void {
    const set = handlers.get(type);
    if (!set) return;
    for (const h of set) {
      try {
        h();
      } catch (e) {
        console.warn(`[push-events] handler for ${type} threw:`, e);
      }
    }
  },
};
