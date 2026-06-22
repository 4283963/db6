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
    let taskId = Date.now().toString();

    clientEvents.emit('send-start', {
      taskId,
      target: targetIP,
      filePath
    });

    socket.connect(PORT, targetIP, () => {
      const fileInfo = createFileReadStream(filePath, {
        onProgress: (sent, total) => {
          clientEvents.emit('send-progress', {
            taskId,
            sent,
            total,
            target: targetIP
          });
        },
        onComplete: () => {
          clientEvents.emit('send-complete', {
            taskId,
            target: targetIP,
            filePath
          });
          socket.end();
          resolve({ taskId, success: true });
        },
        onError: (err) => {
          clientEvents.emit('send-error', {
            taskId,
            target: targetIP,
            error: err.message
          });
          socket.destroy();
          reject(err);
        }
      });

      const header = JSON.stringify({
        name: fileInfo.name,
        size: fileInfo.size
      }) + HEADER_DELIMITER;

      socket.write(header);

      fileStream = fileInfo.stream;
      fileStream.pipe(socket);
    });

    socket.on('error', (err) => {
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
  });
};

module.exports = {
  sendFile,
  clientEvents
};
