const fs = require("fs");
const path = require("path");
const { countUsers, getDbFilePath } = require("../models/userModel");

function toNum(input, fallback) {
  const n = Number(input);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function bytesToMb(bytes) {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

function bytesToGb(bytes) {
  return Number((bytes / (1024 * 1024 * 1024)).toFixed(2));
}

function dirSizeBytes(targetDir) {
  if (!fs.existsSync(targetDir)) return 0;
  let total = 0;
  const items = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(targetDir, item.name);
    if (item.isDirectory()) {
      total += dirSizeBytes(full);
    } else if (item.isFile()) {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

function getCapacity(req, res) {
  const projectRoot = path.join(__dirname, "..");
  const uploadsDir = path.join(projectRoot, "uploads");
  const mediaDir = path.join(projectRoot, "public", "media");
  const dbFile = getDbFilePath();

  const users = countUsers();
  const dbBytes = fs.existsSync(dbFile) ? fs.statSync(dbFile).size : 0;
  const uploadsBytes = dirSizeBytes(uploadsDir);
  const mediaBytes = dirSizeBytes(mediaDir);
  const totalMediaBytes = uploadsBytes + mediaBytes;

  const stats = fs.statfsSync(projectRoot);
  const diskTotalBytes = stats.bsize * stats.blocks;
  const diskFreeBytes = stats.bsize * stats.bfree;

  const activeUsers = toNum(req.query.activeUsers, 1000);
  const avgVideoMb = toNum(req.query.avgVideoMb, 45);
  const avgVideoViewsPerUserPerMonth = toNum(req.query.viewsPerUserPerMonth, 4);
  const avgStreamMbps = toNum(req.query.avgStreamMbps, 1.5);
  const uplinkMbps = toNum(req.query.uplinkMbps, 100);

  const monthlyEgressGb = Number(
    ((activeUsers * avgVideoMb * avgVideoViewsPerUserPerMonth) / 1024).toFixed(2)
  );
  const maxConcurrentStreamers = Math.floor(uplinkMbps / avgStreamMbps);

  res.json({
    users,
    storage: {
      dbFilePath: dbFile,
      dbSizeMb: bytesToMb(dbBytes),
      uploadsSizeMb: bytesToMb(uploadsBytes),
      mediaSizeMb: bytesToMb(mediaBytes),
      totalMediaSizeMb: bytesToMb(totalMediaBytes),
      diskTotalGb: bytesToGb(diskTotalBytes),
      diskFreeGb: bytesToGb(diskFreeBytes)
    },
    estimate: {
      assumptions: {
        activeUsers,
        avgVideoMb,
        viewsPerUserPerMonth: avgVideoViewsPerUserPerMonth,
        avgStreamMbps,
        uplinkMbps
      },
      monthlyEgressGb,
      maxConcurrentStreamers
    }
  });
}

module.exports = {
  getCapacity
};
