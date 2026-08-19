// Some restricted build containers cannot expose resident-set memory.
// Keep normal Node.js behavior everywhere else and provide a safe fallback.
const nativeMemoryUsage = process.memoryUsage.bind(process);
const safeMemoryUsage = () => {
  try {
    return nativeMemoryUsage();
  } catch {
    return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
  }
};
safeMemoryUsage.rss = () => {
  try {
    return nativeMemoryUsage.rss();
  } catch {
    return 0;
  }
};
process.memoryUsage = safeMemoryUsage;
