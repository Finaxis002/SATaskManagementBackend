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
const moment = require("moment-timezone");
const cron = require("node-cron");
const Task = require("../Models/Task");
const { sendEmail } = require("../email/emailService");
//  const {userSocketMap} = require('../socket/socket')

let io = null;
let userSocketMap = {};

function init(ioInstance, socketMap) {
  io = ioInstance;
  userSocketMap = socketMap;
  console.log("✅ Task reminders initialized with socket.io");
  startCronJob();
}

async function sendTaskReminder(task) {
  if (!io || !userSocketMap) {
    console.error("Socket not initialized");
    return;
  }

  if (
    task.completed ||
    !Array.isArray(task.assignees) ||
    task.assignees.length === 0
  ) {
    console.log(
      "Skipping task - no assignees or already completed:",
      task.taskName || task.name
    );
    return;
  }

  if (!task.dueDate) {
    console.log(
      `⏭️ Skipping task "${
        task.taskName || task.name
      }" because dueDate is missing`
    );
    return;
  }

  const now = moment(); 
  const nowIST = now.tz("Asia/Kolkata"); 
  const currentHourIST = nowIST.hour(); 
  const currentMinuteIST = nowIST.minute(); 
  console.log("Current IST Time:", `${currentHourIST}:${currentMinuteIST}`);

  const todayUTC = moment.utc().startOf("day"); 
  const dueDateUTC = moment.utc(task.dueDate).startOf("day"); // Convert task due date to UTC and set to midnight

  const diffDays = dueDateUTC.diff(todayUTC, "days"); // Calculate difference in days

  console.log("\n--- Reminder Check ---");
  console.log("Task:", task.taskName || task.name);
  console.log("Due:", dueDateUTC.toISOString());
  console.log("Today:", todayUTC.toISOString());
  console.log("Days until due:", diffDays);
  console.log("Current IST hour:", currentHourIST);

 

  //   // Only proceed if it's the scheduled time
  //   if (!(isMorningReminder || isEveningReminder || isSixPMReminder || isSixThirtyPMReminder)) {
  //     console.log("⏸️ Not reminder time. Skipping...");
  //     return;
  //   }
  // const isMorningReminder =
  //    (currentHourIST === 10 && currentMinuteIST >= 29) ||
  //    (currentHourIST === 10 && currentMinuteIST <= 31);
  const isMorningReminder = (currentHourIST === 10 && currentMinuteIST >= 29) && (currentMinuteIST <= 31);
  const isEveningReminder =
    (currentHourIST === 16 && currentMinuteIST >= 59) ||
    (currentHourIST === 17 && currentMinuteIST <= 0);
  // const isSixPMReminder =
  //   (currentHourIST === 17 && currentMinuteIST >= 59) ||
  //   (currentHourIST === 18 && currentMinuteIST <= 0);
  // const isMorningReminder = (currentHourIST === 10 && currentMinuteIST >= 29) && (currentMinuteIST <= 31);

  // Only proceed if it's the scheduled time
  if (!(isMorningReminder || isEveningReminder )) {
    console.log("⏸️ Not reminder time. Skipping...");
    return;
  }

  // Now for each assignee
  task.assignees.forEach((assignee) => {
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

    if (diffDays >= 0 && diffDays <= 2) {
      // 🛠 Correct range: 2 days before, 1 day before, today
      let message;
      if (diffDays === 0) {
        message = `⚠️ TODAY: "${
          task.taskName || task.name
        }" due today for ${assigneeName}`;
      } else {
        message = `🔔 Reminder: "${
          task.taskName || task.name
        }" due in ${diffDays} day(s) for ${assigneeName}`;
      }

      io.to(socketId).emit("task-reminder", message);
      console.log("✅ Sent reminder:", message);

      // ✅ Send Email Reminder also (NEW PATCH)
      (async () => {
        try {
          let emailSubject = `⏰ Task Reminder: ${task.taskName || task.name}`;
          let emailBody = `
      Task Reminder
      Dear ${assigneeName},
      This is a reminder that your task "${task.taskName || task.name}"
      is ${diffDays === 0 ? "due today" : `due in ${diffDays} day(s)`}.
      Please complete it before the deadline.
     
      Best Regards,
      Sharda Associates
    `;

          await sendEmail(assigneeEmail, emailSubject, emailBody);
          console.log(`✅ Email sent successfully to ${assigneeEmail}`);
        } catch (error) {
          console.error(
            `❌ Failed to send email to ${assigneeEmail}`,
            error.message
          );
        }
      })();
    } else {
      console.log(
        `⏭️ No reminder needed for ${assigneeName} (${diffDays} days left)`
      );
    }
  });
}

// async function sendLoginReminders(userEmail) {
//   try {
//     console.log(`🔍 Checking login reminders for: ${userEmail}`);
    
//     // Find all incomplete tasks assigned to this user
//     const tasks = await Task.find({
//       status: { $ne: "Completed" },
//       "assignees.email": userEmail
//     }).sort({ dueDate: 1 }); // Sort by due date ascending
    
//     console.log(`📋 Found ${tasks.length} pending tasks for ${userEmail}`);
    
//     const nowIST = moment().tz("Asia/Kolkata");
//     const todayUTC = moment.utc().startOf("day");
//     const socketId = userSocketMap[userEmail];
    
//     if (!socketId) {
//       console.log(`⚠️ No active socket for ${userEmail}`);
//       return;
//     }

//     // Group tasks by status for better organization
//     const overdueTasks = [];
//     const todayTasks = [];
//     const upcomingTasks = [];
    
//     tasks.forEach(task => {
//       if (!task.dueDate) {
//         console.log(`⏭️ Skipping task "${task.taskName}" - no due date`);
//         return;
//       }
      
//       const dueDateUTC = moment.utc(task.dueDate).startOf("day");
//       const diffDays = dueDateUTC.diff(todayUTC, "days");
      
//       const assignee = task.assignees.find(a => a.email === userEmail);
//       if (!assignee) return;
      
//       if (diffDays < 0) {
//         overdueTasks.push({ task, diffDays: Math.abs(diffDays) });
//       } else if (diffDays === 0) {
//         todayTasks.push(task);
//       } else {
//         upcomingTasks.push({ task, diffDays });
//       }
//     });

//     // Send consolidated reminders (matches your existing toast format)
//     if (overdueTasks.length > 0) {
//       const message = `❗ You have ${overdueTasks.length} overdue task(s)`;
//       const details = overdueTasks.map(t => 
//         `"${t.task.taskName}" (${t.diffDays} day(s) late`
//       ).join('\n');
      
//       io.to(socketId).emit('task-reminder', { 
//         message,
//         details,
//         type: 'overdue',
//         assigneeEmail: userEmail
//       });
//     }

//     if (todayTasks.length > 0) {
//       const message = `⚠️ You have ${todayTasks.length} task(s) due today`;
//       const details = todayTasks.map(t => 
//         `"${t.taskName}"`
//       ).join('\n');
      
//       io.to(socketId).emit('task-reminder', { 
//         message,
//         details,
//         type: 'today',
//         assigneeEmail: userEmail
//       });
//     }

//     if (upcomingTasks.length > 0) {
//       const message = `🔔 You have ${upcomingTasks.length} upcoming task(s)`;
//       const details = upcomingTasks.map(t => 
//         `"${t.task.taskName}" (in ${t.diffDays} day(s))`
//       ).join('\n');
      
//       io.to(socketId).emit('task-reminder', { 
//         message,
//         details,
//         type: 'upcoming',
//         assigneeEmail: userEmail
//       });
//     }

//     // Also send individual reminders (like your cron job does)
//     tasks.forEach(task => {
//       const dueDateUTC = moment.utc(task.dueDate).startOf("day");
//       const diffDays = dueDateUTC.diff(todayUTC, "days");
      
//       if (diffDays >= 0 && diffDays <= 2) {
//         const assignee = task.assignees.find(a => a.email === userEmail);
//         if (!assignee) return;
        
//         let message;
//         if (diffDays === 0) {
//           message = `⚠️ LOGIN REMINDER: "${task.taskName}" due today`;
//         } else {
//           message = `🔔 LOGIN REMINDER: "${task.taskName}" due in ${diffDays} day(s)`;
//         }
        
//         io.to(socketId).emit('task-reminder', {
//           message,
//           assigneeEmail: userEmail,
//           type: 'individual'
//         });
//       }
//     });
    
//   } catch (error) {
//     console.error("❌ Error sending login reminders:", error);
//   }
// }
async function sendLoginReminders(userEmail) {
  try {
    console.log(`🔍 Checking login reminders for: ${userEmail}`);

    const tasks = await Task.find({
      status: { $ne: "Completed" },
      "assignees.email": userEmail
    }).sort({ dueDate: 1 });

    console.log(`📋 Found ${tasks.length} pending tasks for ${userEmail}`);

    const nowIST = moment().tz("Asia/Kolkata");
    const todayUTC = moment.utc().startOf("day");
    const socketId = userSocketMap[userEmail];

    if (!socketId) {
      console.log(`⚠️ No active socket for ${userEmail}`);
      return;
    }

    tasks.forEach(task => {
      if (!task.dueDate) {
        console.log(`⏭️ Skipping task "${task.taskName}" - no due date`);
        return;
      }

      const dueDateUTC = moment.utc(task.dueDate).startOf("day");
      const diffDays = dueDateUTC.diff(todayUTC, "days");

      const assignee = task.assignees.find(a => a.email === userEmail);
      if (!assignee) return;

      // Only send if within 0-2 days range
      if (diffDays >= 0 && diffDays <= 2) {
        let message;
        if (diffDays === 0) {
          message = `⚠️ TODAY: "${task.taskName || task.name}" due today for ${assignee.name}`;
        } else {
          message = `🔔 Reminder: "${task.taskName || task.name}" due in ${diffDays} day(s) for ${assignee.name}`;
        }

        io.to(socketId).emit('task-reminder', {
          message,
          assigneeEmail: userEmail,
          type: 'login'
        });

        console.log("✅ Sent login reminder:", message);
      } else {
        console.log(`⏭️ Task "${task.taskName}" is not within login reminder range`);
      }
    });
  } catch (error) {
    console.error("❌ Error in sendLoginReminders:", error);
  }
}


function startCronJob() {
  console.log("⏰ Starting reminder cron job");
  cron.schedule("* * * * *", async () => {
    console.log("🔄 Checking for due tasks at", new Date().toLocaleString());
    try {
      const tasks = await Task.find({ status: { $ne: "Completed" } }); // ✅ Correct query
      console.log(`🔍 Found ${tasks.length} incomplete tasks`);
      tasks.forEach((task) => sendTaskReminder(task));
    } catch (error) {
      console.error("❌ Reminder error:", error);
    }
  });
}

module.exports = {
  init,
  sendTaskReminder,
  sendLoginReminders
};
