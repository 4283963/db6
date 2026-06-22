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

const createFileReadStream = (filePath, callbacks = {}) => {
  const { onProgress, onComplete, onError } = callbacks;
  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  const fileName = path.basename(filePath);
  const readStream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });

  let bytesSent = 0;

  readStream.on('data', (chunk) => {
    bytesSent += chunk.length;
    if (onProgress) {
      onProgress(bytesSent, fileSize);
    }
  });

  readStream.on('end', () => {
    if (onComplete) {
      onComplete();
    }
  });

  readStream.on('error', (err) => {
    if (onError) {
      onError(err);
    }
  });

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

  writeStream.on('drain', () => {});

  const originalWrite = writeStream.write.bind(writeStream);
  writeStream.write = (chunk, encoding, cb) => {
    bytesReceived += chunk.length;
    if (onProgress) {
      onProgress(Math.min(bytesReceived, fileSize));
    }
    return originalWrite(chunk, encoding, cb);
  };

  writeStream.on('finish', () => {
    if (onComplete) {
      onComplete(savePath);
    }
  });

  writeStream.on('error', (err) => {
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
