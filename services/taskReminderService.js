

////////////////////////////////////////////////////////////////
// const cron = require('node-cron');
// const Task = require("../Models/Task");
// const socketManager = require('../socket/socket')
// let io = null;

// function init(ioInstance) {
//   io = ioInstance;
//   console.log('✅ Task reminders initialized with socket.io');
//   startCronJob();
// }

// async function sendTaskReminder(task) {
//   if (!io) {
//     console.error("Socket.io not initialized");
//     return;
//   }

//   const assigneeEmail = task.assignee?.email;
//   const assigneeName = task.assignee?.name;

//   // console.log("Task Object:", task);
//   // console.log("Assignee Object:", task.assignee);

//   if (task.completed || !assigneeEmail || !assigneeName) {
//     console.log('Skipping task - completed or missing assignee:', task.name);
//     return;
//   }

//   const now = new Date();
//   const currentHourIST = now.getHours();

//   // UTC-based date comparison
//   const todayUTC = new Date(Date.UTC(
//     now.getUTCFullYear(),
//     now.getUTCMonth(),
//     now.getUTCDate()
//   ));
  
//   const dueDateUTC = new Date(task.due);
//   dueDateUTC.setUTCHours(0, 0, 0, 0);

//   const diffDays = Math.floor((dueDateUTC - todayUTC) / (1000 * 3600 * 24));

//   console.log('\n--- Reminder Check ---');
//   console.log('Task:', task.name);
//   console.log('Due:', dueDateUTC.toISOString());
//   console.log('Today:', todayUTC.toISOString());
//   console.log('Days until due:', diffDays);
//   console.log('Current IST hour:', currentHourIST);

//   const userSocketMap = socketManager.getSocketMap();
//   console.log("userSocketMap before sending reminder:", userSocketMap);
//   const socketId = userSocketMap[assigneeEmail];
//   console.log("socket id is available ", socketId)

//   // if (socketId) {
//   //   // console.log(`Assignee ${assigneeEmail} not found in userSocketMap`);
//   //   // return;  // If the user is not found in the socket map, return early
//   //   const message = `⚠️ TODAY: "${task.name}" due today for ${assigneeName}`;
  
//   // // Emit reminder message with the assignee's email
//   // io.to(socketId).emit('task-reminder', { message, assigneeEmail });
//   // console.log('Sent today reminder:', message);
//   // }
//   // if (!socketId) {
//   //   console.log(`Assignee ${assigneeEmail} not found in userSocketMap`);
//   //   return;  // If the socket ID is not found, do not send the reminder
//   // }
//   if (socketId) {
//     io.to(socketId).emit('task-reminder', { message, assigneeEmail });
//     console.log('Reminder sent to:', assigneeEmail);
//   } else {
//     console.log('No socket ID found for:', assigneeEmail);  // Log if the socket ID is missing
//   }
  

//   if (diffDays >= 1 && diffDays <= 3) {
//     const message = `🔔 Reminder: "${task.name}" due in ${diffDays} day(s) for  ${assigneeName}`;
    
//     // io.emit('task-reminder', { message, assigneeEmail });
//     io.to(socketId).emit('task-reminder', { message, assigneeEmail });  
//     console.log('Sent reminder:', message);
//     // Emit reminder only to the assignee based on their email
//     // const socketId = userSocketMap[assigneeEmail];  // Get the socket ID of the assignee
//     // console.log("socket id for assignee " , socketId)
//     // if (socketId) {
//     //   io.to(socketId).emit('task-reminder', message);  // Emit to specific user
//     //   console.log('Sent reminder:', message);
//     // } else {
//     //   console.log('Assignee socket not found');
//     // }
//   }

//   if (diffDays === 0) {
//     const message = `⚠️ TODAY: "${task.name}" due today for  ${assigneeName}`;
//     // io.emit('task-reminder', { message, assigneeEmail });
//     io.to(socketId).emit('task-reminder', { message, assigneeEmail });
//     console.log('Sent today reminder:', message);

//     // const socketId = userSocketMap[assigneeEmail];  // Get the socket ID of the assignee
//     // console.log("socket id for assignee for today due date" , socketId)

//     // if (socketId) {
//     //   io.to(socketId).emit('task-reminder', message);  // Emit to specific user
//     //   console.log('Sent today reminder:', message);
//     // }

//     if (currentHourIST === 11 || currentHourIST === 17) {
//       const timeMsg = currentHourIST === 11 ? 'Morning' : 'Evening';
//       const fullMsg = `🌞 ${timeMsg} reminder: "${task.name}" due today! for  ${assigneeName}`;
//       // io.to(socketId).emit('task-reminder', fullMsg); 
//       io.to(socketId).emit('task-reminder', { message: fullMsg, assigneeEmail });
//       // io.emit('task-reminder', { message: fullMsg, assigneeEmail });
//       console.log('Sent time-based reminder:', fullMsg);
//     }
//   }
// }

// function startCronJob() {
//   console.log('⏰ Starting reminder cron job');
//   cron.schedule('* * * * *', async () => {
//     console.log('🔄 Checking for due tasks at', new Date().toLocaleString());
//     try {
//       const tasks = await Task.find({ completed: false });
//       console.log(`🔍 Found ${tasks.length} incomplete tasks`);
//       tasks.forEach(task => sendTaskReminder(task));
//     } catch (error) {
//       console.error("❌ Reminder error:", error);
//     }
//   });
// }

// module.exports = {
//   init,
//   sendTaskReminder
// };



///////////////////////////////////////////////////////////////
const moment = require('moment-timezone');
const cron = require('node-cron');
const Task = require("../Models/Task");
const { sendEmail } = require('../email/emailService');
//  const {userSocketMap} = require('../socket/socket')

let io = null;
let userSocketMap = {};

function init(ioInstance, socketMap) {
  io = ioInstance;
  userSocketMap = socketMap;
  console.log('✅ Task reminders initialized with socket.io');
  startCronJob();
}


async function sendTaskReminder(task) {
  if (!io || !userSocketMap) {
    console.error("Socket not initialized");
    return;
  }

  if (task.completed || !Array.isArray(task.assignees) || task.assignees.length === 0) {
    console.log('Skipping task - no assignees or already completed:', task.taskName || task.name);
    return;
  }

  if (!task.dueDate) {
    console.log(`⏭️ Skipping task "${task.taskName || task.name}" because dueDate is missing`);
    return;
  }


  const now = moment();  // Get current time in local timezone
  const nowIST = now.tz("Asia/Kolkata");  // Convert to IST using moment-timezone
  const currentHourIST = nowIST.hour();  // Get current hour in IST
  const currentMinuteIST = nowIST.minute();  // Get current minute in IST
  console.log("Current IST Time:", `${currentHourIST}:${currentMinuteIST}`);


  const todayUTC = moment.utc().startOf('day');  // Get UTC date for today, at midnight
  const dueDateUTC = moment.utc(task.dueDate).startOf('day');  // Convert task due date to UTC and set to midnight

  const diffDays = dueDateUTC.diff(todayUTC, 'days');  // Calculate difference in days

  console.log('\n--- Reminder Check ---');
  console.log('Task:', task.taskName || task.name);
  console.log('Due:', dueDateUTC.toISOString());
  console.log('Today:', todayUTC.toISOString());
  console.log('Days until due:', diffDays);
  console.log('Current IST hour:', currentHourIST);
  
  
  // Check if current time is within the scheduled time windows
  // Check if current time is within the scheduled time windows
// const isMorningReminder = (currentHourIST === 10 && currentMinute >= 55) || (currentHourIST === 11 && currentMinute <= 5);
// const isEveningReminder = (currentHourIST === 16 && currentMinute >= 55) || (currentHourIST === 17 && currentMinute <= 5);
// const isSixPMReminder = (currentHourIST === 17 && currentMinute >= 55) || (currentHourIST === 18 && currentMinute <= 5);

// const isSixThirtyPMReminder = (currentHourIST === 18 && currentMinute >= 25) && (currentMinute <= 35);

//   // Only proceed if it's the scheduled time
//   if (!(isMorningReminder || isEveningReminder || isSixPMReminder || isSixThirtyPMReminder)) {
//     console.log("⏸️ Not reminder time. Skipping...");
//     return;
//   }
const isMorningReminder = (currentHourIST === 10 && currentMinuteIST >= 59) || (currentHourIST === 11 && currentMinuteIST <= 0);
const isEveningReminder = (currentHourIST === 16 && currentMinuteIST >= 59) || (currentHourIST === 17 && currentMinuteIST <= 0);
const isSixPMReminder = (currentHourIST === 17 && currentMinuteIST >= 59) || (currentHourIST === 18 && currentMinuteIST <= 0);
// const isSixThirtyPMReminder = (currentHourIST === 15 && currentMinuteIST >= 29) && (currentMinuteIST <= 32);



// Only proceed if it's the scheduled time
if (!(isMorningReminder || isEveningReminder || isSixPMReminder)) {
  console.log("⏸️ Not reminder time. Skipping...");
  return;
}

  // Now for each assignee
  task.assignees.forEach(assignee => {
    const assigneeEmail = assignee.email;
    const assigneeName = assignee.name;
    const socketId = userSocketMap[assigneeEmail];

    if (!assigneeEmail || !assigneeName) {
      console.log(`Skipping assignee with missing data`);
      return;
    }

    if (!socketId) {
      console.log(`No socket found for assignee: ${assigneeEmail}`);
      return;
    }

    if (diffDays >= 0 && diffDays <= 2) {  // 🛠 Correct range: 2 days before, 1 day before, today
      let message;
      if (diffDays === 0) {
        message = `⚠️ TODAY: "${task.taskName || task.name}" due today for ${assigneeName}`;
      } else {
        message = `🔔 Reminder: "${task.taskName || task.name}" due in ${diffDays} day(s) for ${assigneeName}`;
      }

      io.to(socketId).emit('task-reminder', message);
      console.log('✅ Sent reminder:', message);

      // ✅ Send Email Reminder also (NEW PATCH)
(async () => {
  try {
    let emailSubject = `⏰ Task Reminder: ${task.taskName || task.name}`;
    let emailBody = `
      Task Reminder
      Dear ${assigneeName},
      This is a reminder that your task "${task.taskName || task.name}"
      is ${diffDays === 0 ? 'due today' : `due in ${diffDays} day(s)`}.
      Please complete it before the deadline.
     
      Best Regards,
      Sharda Associates
    `;

    await sendEmail(assigneeEmail, emailSubject, emailBody);
    console.log(`✅ Email sent successfully to ${assigneeEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${assigneeEmail}`, error.message);
  }
})();

    } else {
      console.log(`⏭️ No reminder needed for ${assigneeName} (${diffDays} days left)`);
    }
  });
}


function startCronJob() {
  console.log('⏰ Starting reminder cron job');
  cron.schedule('* * * * *', async () => {
    console.log('🔄 Checking for due tasks at', new Date().toLocaleString());
    try {
      const tasks = await Task.find({ status: { $ne: "Completed" } }); // ✅ Correct query
      console.log(`🔍 Found ${tasks.length} incomplete tasks`);
      tasks.forEach(task => sendTaskReminder(task));
    } catch (error) {
      console.error("❌ Reminder error:", error);
    }
  });
  
}


module.exports = {
  init,
  sendTaskReminder
};

