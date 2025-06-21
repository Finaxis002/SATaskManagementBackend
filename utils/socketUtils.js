// utils/socketUtils.js

const socketUserMap = {}; // Maps username → socket.id

const registerUserSocket = (username, socketId) => {
  socketUserMap[username] = socketId;
};

const removeUserSocket = (socketId) => {
  for (const [username, id] of Object.entries(socketUserMap)) {
    if (id === socketId) {
      delete socketUserMap[username];
      break;
    }
  }
};

const getSocketIdByName = (username) => {
  return socketUserMap[username];
};

module.exports = {
  registerUserSocket,
  removeUserSocket,
  getSocketIdByName,
};
