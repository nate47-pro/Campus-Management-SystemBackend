const { logSystemEvent } = require('../utils/logger');

const logAdminAction = async (req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    const logData = {
      type: 'ADMIN_ACTION',
      description: `${req.method} ${req.originalUrl}`,
      userId: req.user?.id,
      ipAddress: req.ip
    };
    
    logSystemEvent(
      logData.type,
      logData.description,
      logData.userId,
      logData.ipAddress
    );
    
    originalSend.call(this, data);
  };
  next();
};

module.exports = { logAdminAction }; 