// The worker that shades dice maps off the page's thread (see dicemaps.js, and faceMapsAhead in dice3d.js).
import { shade } from './dicemaps.js';

self.onmessage = ({ data }) => {
  const px = shade(...data.args);
  self.postMessage({ id: data.id, px }, Object.values(px).filter(Boolean).map((a) => a.buffer));
};
