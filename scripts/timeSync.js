// scripts/timeSync.js
let timeOffset = 0;

export async function initTimeSync() {
  try {
    const res = await fetch('https://oauth2.googleapis.com', { method: 'HEAD' });
    const serverDate = res.headers.get('date');
    if (serverDate) {
      const serverTime = new Date(serverDate).getTime();
      const localTime = Date.now();
      timeOffset = serverTime - localTime;
      if (Math.abs(timeOffset) > 1000) {
        console.log(`[TimeSync] Detected clock skew: ${Math.round(timeOffset / 1000)}s offset from Google servers. Syncing...`);
        const OrigDate = globalThis.Date;
        class SyncedDate extends OrigDate {
          constructor(...args) {
            if (args.length === 0) {
              super(OrigDate.now() + timeOffset);
            } else {
              super(...args);
            }
          }
          static now() {
            return OrigDate.now() + timeOffset;
          }
        }
        globalThis.Date = SyncedDate;
      }
    }
  } catch (err) {
    // offline fallback
  }
}
