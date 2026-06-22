const fs = require('fs');
const path = require('path');
const os = require('os');

const getDownloadDir = () => {
  const downloadPath = path.join(os.homedir(), 'Downloads', 'LANTransfer');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath, { recursive: true });
  }
  return downloadPath;
};

const generateUniquePath = (dir, fileName) => {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  let counter = 1;
  let result = path.join(dir, fileName);

  while (fs.existsSync(result)) {
    result = path.join(dir, `${base}_${counter}${ext}`);
    counter++;
  }
  return result;
};

const createFileReadStream = (filePath) => {
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const fileName = path.basename(filePath);
  const readStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

  return {
    stream: readStream,
    name: fileName,
    size: fileSize
  };
};

const receiveFileStream = (fileName, fileSize, callbacks = {}) => {
  const { onProgress, onComplete, onError } = callbacks;
  const downloadDir = getDownloadDir();
  const savePath = generateUniquePath(downloadDir, fileName);
  const writeStream = fs.createWriteStream(savePath, { highWaterMark: 64 * 1024 });

  let bytesReceived = 0;
  let progressTimer = null;

  progressTimer = setInterval(() => {
    if (onProgress && bytesReceived > 0) {
      onProgress(Math.min(bytesReceived, fileSize));
    }
  }, 200);

  const originalWrite = writeStream.write.bind(writeStream);
  writeStream.write = (chunk, encoding, cb) => {
    bytesReceived += chunk.length;
    return originalWrite(chunk, encoding, cb);
  };

  writeStream.on('finish', () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (onProgress) {
      onProgress(fileSize);
    }
    if (onComplete) {
      onComplete(savePath);
    }
  });

  writeStream.on('error', (err) => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    if (fs.existsSync(savePath)) {
      try { fs.unlinkSync(savePath); } catch (e) {}
    }
    if (onError) {
      onError(err);
    }
  });

  return writeStream;
};

module.exports = {
  createFileReadStream,
  receiveFileStream,
  getDownloadDir
};
