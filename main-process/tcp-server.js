const net = require('net');
const os = require('os');
const { EventEmitter } = require('events');
const { receiveFileStream } = require('./file-stream');

const PORT = 9821;
const HEADER_DELIMITER = '\n';

const serverEvents = new EventEmitter();
let tcpServer = null;

const getLocalIPAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};

const parseHeader = (buffer) => {
  try {
    const headerStr = buffer.toString('utf8');
    return JSON.parse(headerStr);
  } catch (e) {
    return null;
  }
};

const handleConnection = (socket) => {
  const remoteAddr = socket.remoteAddress;
  serverEvents.emit('client-connected', { address: remoteAddr });

  let headerBuffer = Buffer.alloc(0);
  let headerParsed = false;
  let fileReceiver = null;
  let totalReceived = 0;
  let fileSize = 0;
  let fileName = '';

  socket.on('data', (chunk) => {
    if (!headerParsed) {
      headerBuffer = Buffer.concat([headerBuffer, chunk]);
      const delimiterIndex = headerBuffer.indexOf(HEADER_DELIMITER);

      if (delimiterIndex !== -1) {
        const headerBytes = headerBuffer.slice(0, delimiterIndex);
        const remainingData = headerBuffer.slice(delimiterIndex + 1);
        const header = parseHeader(headerBytes);

        if (header) {
          fileName = header.name;
          fileSize = header.size;
          headerParsed = true;

          fileReceiver = receiveFileStream(fileName, fileSize, {
            onProgress: (received) => {
              serverEvents.emit('receive-progress', {
                fileName,
                received,
                total: fileSize,
                from: remoteAddr
              });
            },
            onComplete: (savePath) => {
              serverEvents.emit('receive-complete', {
                fileName,
                savePath,
                fileSize,
                from: remoteAddr
              });
              socket.end();
            },
            onError: (err) => {
              serverEvents.emit('receive-error', {
                fileName,
                error: err.message,
                from: remoteAddr
              });
              socket.destroy();
            }
          });

          if (remainingData.length > 0) {
            totalReceived += remainingData.length;
            fileReceiver.write(remainingData);
          }
        } else {
          socket.destroy();
        }
      }
    } else {
      totalReceived += chunk.length;
      fileReceiver.write(chunk);

      if (totalReceived >= fileSize) {
        fileReceiver.end();
      }
    }
  });

  socket.on('end', () => {
    if (fileReceiver) {
      fileReceiver.end();
    }
  });

  socket.on('error', (err) => {
    serverEvents.emit('socket-error', { address: remoteAddr, error: err.message });
    if (fileReceiver) {
      fileReceiver.destroy();
    }
  });
};

const startTCPServer = () => {
  if (tcpServer) return;

  tcpServer = net.createServer(handleConnection);

  tcpServer.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    serverEvents.emit('server-started', {
      address: localIP,
      port: PORT
    });
  });

  tcpServer.on('error', (err) => {
    serverEvents.emit('server-error', { error: err.message });
  });
};

module.exports = {
  startTCPServer,
  serverEvents,
  getLocalIPAddress,
  PORT
};
