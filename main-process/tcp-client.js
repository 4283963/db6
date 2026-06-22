const net = require('net');
const { EventEmitter } = require('events');
const { createFileReadStream } = require('./file-stream');
const { PORT } = require('./tcp-server');

const clientEvents = new EventEmitter();
const HEADER_DELIMITER = '\n';

const sendFile = (targetIP, filePath) => {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let fileStream = null;
    let progressTimer = null;
    let taskId = Date.now().toString();

    const cleanup = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    };

    clientEvents.emit('send-start', {
      taskId,
      target: targetIP,
      filePath
    });

    socket.connect(PORT, targetIP, () => {
      const fileInfo = createFileReadStream(filePath);
      const { stream: readStream, name: fileName, size: fileSize } = fileInfo;
      fileStream = readStream;

      const header = JSON.stringify({
        name: fileName,
        size: fileSize
      }) + HEADER_DELIMITER;

      socket.write(header);

      progressTimer = setInterval(() => {
        if (readStream.bytesRead !== undefined) {
          clientEvents.emit('send-progress', {
            taskId,
            sent: readStream.bytesRead,
            total: fileSize,
            target: targetIP
          });
        }
      }, 200);

      readStream.pipe(socket);

      readStream.on('end', () => {
        cleanup();
        clientEvents.emit('send-complete', {
          taskId,
          target: targetIP,
          filePath
        });
        clientEvents.emit('send-progress', {
          taskId,
          sent: fileSize,
          total: fileSize,
          target: targetIP
        });
        socket.end();
        resolve({ taskId, success: true });
      });

      readStream.on('error', (err) => {
        cleanup();
        clientEvents.emit('send-error', {
          taskId,
          target: targetIP,
          error: err.message
        });
        socket.destroy();
        reject(err);
      });
    });

    socket.on('error', (err) => {
      cleanup();
      clientEvents.emit('send-error', {
        taskId,
        target: targetIP,
        error: err.message
      });
      if (fileStream) {
        fileStream.destroy();
      }
      reject(err);
    });

    socket.on('close', () => {
      cleanup();
    });
  });
};

module.exports = {
  sendFile,
  clientEvents
};
