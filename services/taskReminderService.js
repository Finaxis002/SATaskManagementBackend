// const cron = require('node-cron');
//  const Task = require("../Models/Task");  // Make sure the Task model is imported

// // Function to send reminders
// async function sendTaskReminder(task) {
//   // Extracting necessary dataa
//   const assigneeEmail = task.assignee.email;
//   const assigneeName = task.assignee.name;

//   if (task.completed) return;  // Don't send reminder if task is completed

//   const dueDate = new Date(task.due);
//   const today = new Date();
//   const diffDays = Math.floor((dueDate - today) / (1000 * 3600 * 24));  // Calculate days difference

//   // Handle sending reminders before the due date (3, 2, 1 days before)
//   if (diffDays === 3 || diffDays === 2 || diffDays === 1) {
//     console.log(`Reminder: Task "${task.name}" is due in ${diffDays} day(s) for ${assigneeName}`);
//   }

//   // Handle reminders for the due date (morning and evening)
//   if (diffDays === 0) {
//     const currentHour = today.getHours();

//     if (currentHour === 11) {
//       console.log(`Morning reminder: Task "${task.name}" is due today! Sent to ${assigneeName}`);
//     }

//     if (currentHour === 17) {
//       console.log(`Evening reminder: Task "${task.name}" is due today! Sent to ${assigneeName}`);
//     }
//   }
// }

// // Schedule cron job to run every day at midnight (adjust as necessary)
// cron.schedule('* * * * *', async () => {
//   try {
//     // Find all tasks that are not completed
//     const tasks = await Task.find({ completed: false });
//     for (const task of tasks) {
//       await sendTaskReminder(task);  // Call the reminder function for each task
//     }
//   } catch (error) {
//     console.error("Error sending reminders:", error);
//   }
// });

// module.exports = {
//   sendTaskReminder
// };

///////////////////////////////////////////////////////////////////////////////////////////////


// const cron = require('node-cron');
// const Task = require("../Models/Task");  // Make sure the Task model is imported

// let ioInstance = null;  // Will hold the socket.io instance

// // Initialize function to receive io instance
// function init(io) {
//   ioInstance = io;
//   startCronJob();
// }

// // Function to send reminders
// // async function sendTaskReminder(task) {
// //   // Extract necessary data
// //   const assigneeEmail = task.assignee.email;
// //   const assigneeName = task.assignee.name;

// //   if (task.completed) return;  // Don't send reminder if task is completed

// //   // Normalize both today's date and due date to midnight UTC (ignoring time)
// //   const dueDate = new Date(task.due);
// //   const today = new Date();

// //   // Set today to midnight (start of the day)
// //   today.setHours(0, 0, 0, 0);

// //   // Calculate the difference in days between the due date and today
// //   const diffTime = dueDate - today;
// //   const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));  // Calculate days difference

// //   // Handle sending reminders before the due date (3, 2, 1 days before)
// //   if (diffDays === 3 || diffDays === 2 || diffDays === 1 || diffDays === 0) {
// //     console.log(`Reminder: Task "${task.name}" is due in ${diffDays} day(s) for ${assigneeName}`);
// //   }

// //   // Handle reminders for the due date (morning and evening)
// //   if (diffDays === 0) {
// //     const currentHour = today.getHours();  // Get the current hour

// //     // Morning reminder
// //     if (currentHour === 11) {
// //       console.log(`Morning reminder: Task "${task.name}" is due today! Sent to ${assigneeName}`);
// //     }

// //     // Evening reminder
// //     if (currentHour === 17) {
// //       console.log(`Evening reminder: Task "${task.name}" is due today! Sent to ${assigneeName}`);
// //     }
// //   }
// // }
// async function sendTaskReminder(task, io) {
//   const assigneeEmail = task.assignee.email;
//   const assigneeName = task.assignee.name;

//   if (task.completed) return;

//   // Get current date and time in IST
//   const now = new Date();
//   const currentHourIST = now.getHours();
  
//   // Parse due date from task (assuming task.due is in ISO format or parsable by Date)
//   const dueDate = new Date(task.due);
  
//   // Normalize both dates to midnight in local time (IST)
//   const today = new Date();
//   today.setHours(0, 0, 0, 0);
  
//   // Create a copy of dueDate and normalize to midnight
//   const dueDateMidnight = new Date(dueDate);
//   dueDateMidnight.setHours(0, 0, 0, 0);

//   // Calculate difference in days
//   const diffTime = dueDateMidnight - today;
//   const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

//   // Debugging logs with IST timezone
//   console.log("\n--- Task Reminder Check ---");
//   console.log("Current IST Time:", now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
//   console.log("Task Due Date (original):", task.due);
//   console.log("Task Due Date (parsed):", dueDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
//   console.log("Today Midnight (IST):", today.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
//   console.log("Due Date Midnight (IST):", dueDateMidnight.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
//   console.log("Days Difference:", diffDays);
//   console.log("Current Hour (IST):", currentHourIST);

//   // Send reminders for upcoming tasks
//   if (diffDays === 3 || diffDays === 2 || diffDays === 1) {
//     console.log(`🔔 Reminder: Task "${task.name}" is due in ${diffDays} day(s) for ${assigneeName}`);
//     const reminderMessage = `🔔 Reminder: Task "${task.name}" is due in ${diffDays} day(s) for ${assigneeName}`;
//     console.log(reminderMessage);
//     io.emit('task-reminder', reminderMessage);
//   }

//   // Send reminders for today's tasks
//   if (diffDays === 0) {
//     console.log(`⚠️ TODAY'S TASK: "${task.name}" for ${assigneeName}`);
//     const reminderMessage = `⚠️ TODAY'S TASK: "${task.name}" for ${assigneeName}`;
//     console.log(reminderMessage);
//     io.emit('task-reminder', reminderMessage); // Emit to the frontend
    
//     if (currentHourIST === 11) {
//       console.log(`🌅 Morning reminder: Task "${task.name}" is due today! Sent to ${assigneeName}`);
//       io.emit('task-reminder', `🌅 Morning reminder: Task "${task.name}" is due today!`);
//     }
//     else if (currentHourIST === 17) {
//       console.log(`🌇 Evening reminder: Task "${task.name}" is due today! Sent to ${assigneeName}`);
//       io.emit('task-reminder', `🌇 Evening reminder: Task "${task.name}" is due today!`);
//     }
//     else {
//       console.log(`ℹ️ Task due today, but not at reminder time (current hour: ${currentHourIST})`);
//     }
//   }
// }





// // Schedule cron job to run every minute (for testing, change this to run daily in production)
// // cron.schedule('* * * * *', async () => {  // This runs every minute for testing purposes
// //   console.log('Cron job running every minute...');
// //   try {
// //     // Find all tasks that are not completed
// //     const tasks = await Task.find({ completed: false });
// //     for (const task of tasks) {
// //       await sendTaskReminder(task, io);  // Call the reminder function for each task
// //     }
// //   } catch (error) {
// //     console.error("Error sending reminders:", error);
// //   }
// // });
// function startCronJob() {
//   // Runs every minute for testing - change for production
//   cron.schedule('* * * * *', async () => {
//     try {
//       const tasks = await Task.find({ completed: false });
//       tasks.forEach(task => sendTaskReminder(task));
//     } catch (error) {
//       console.error("Reminder error:", error);
//     }
//   });
// }


// module.exports = {
//   init,
//   sendTaskReminder
// };


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
const cron = require('node-cron');
const Task = require("../Models/Task");
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
  // if (!io) {
  //   console.error("Socket.io not initialized");
  //   return;
  // }
  if (!io || !userSocketMap) {
    console.error("Socket not initialized");
    return;
  }

  const assigneeEmail = task.assignee?.email;
  const assigneeName = task.assignee?.name;

  // console.log("Task Object:", task);
  // console.log("Assignee Object:", task.assignee);

  if (task.completed || !assigneeEmail || !assigneeName) {
    console.log('Skipping task - completed or missing assignee:', task.name);
    return;
  }

  const now = new Date();
  const currentHourIST = now.getHours();

  // UTC-based date comparison
  const todayUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  
  const dueDateUTC = new Date(task.due);
  dueDateUTC.setUTCHours(0, 0, 0, 0);

  const diffDays = Math.floor((dueDateUTC - todayUTC) / (1000 * 3600 * 24));

  console.log('\n--- Reminder Check ---');
  console.log('Task:', task.name);
  console.log('Due:', dueDateUTC.toISOString());
  console.log('Today:', todayUTC.toISOString());
  console.log('Days until due:', diffDays);
  console.log('Current IST hour:', currentHourIST);
  console.log('Current userSocketMap:', userSocketMap);
  const socketId = userSocketMap[assigneeEmail];  // Get the socket ID of the assignee

  // if (!socketId) {
  //   console.log(`Assignee ${assigneeEmail} not found in userSocketMap`);
  //   return;  // If the user is not found in the socket map, return early
  // }
  // if (!socketId) {
  //   console.log(`Assignee ${assigneeEmail} not currently connected`);
  //   return;
  // }
  // if (socketId) {
  //       io.to(socketId).emit('task-reminder', { message, assigneeEmail });
  //        console.log('Reminder sent to:', assigneeEmail);
  //      } else {
  //       console.log('No socket ID found for:', assigneeEmail);  // Log if the socket ID is missing
  //      }

  if (diffDays >= 1 && diffDays <= 3) {
    const message = `🔔 Reminder: "${task.name}" due in ${diffDays} day(s) for  ${assigneeName}`;
    
    // io.emit('task-reminder', { message, assigneeEmail });
    io.to(socketId).emit('task-reminder', message);
    console.log('Sent reminder:', message);
    // Emit reminder only to the assignee based on their email
    // const socketId = userSocketMap[assigneeEmail];  // Get the socket ID of the assignee
    // console.log("socket id for assignee " , socketId)
    // if (socketId) {
    //   io.to(socketId).emit('task-reminder', message);  // Emit to specific user
    //   console.log('Sent reminder:', message);
    // } else {
    //   console.log('Assignee socket not found');
    // }
  }

  if (diffDays === 0) {
    const message = `⚠️ TODAY: "${task.name}" due today for  ${assigneeName}`;
    // io.emit('task-reminder', { message, assigneeEmail });
    io.to(socketId).emit('task-reminder', message); 
    console.log('Sent today reminder:', message);

    // const socketId = userSocketMap[assigneeEmail];  // Get the socket ID of the assignee
    // console.log("socket id for assignee for today due date" , socketId)

    // if (socketId) {
    //   io.to(socketId).emit('task-reminder', message);  // Emit to specific user
    //   console.log('Sent today reminder:', message);
    // }

    if (currentHourIST === 11 || currentHourIST === 17) {
      const timeMsg = currentHourIST === 11 ? 'Morning' : 'Evening';
      const fullMsg = `🌞 ${timeMsg} reminder: "${task.name}" due today! for  ${assigneeName}`;
      io.to(socketId).emit('task-reminder', fullMsg); 
      // io.emit('task-reminder', { message: fullMsg, assigneeEmail });
      console.log('Sent time-based reminder:', fullMsg);
    }
  }
}

function startCronJob() {
  console.log('⏰ Starting reminder cron job');
  cron.schedule('* * * * *', async () => {
    console.log('🔄 Checking for due tasks at', new Date().toLocaleString());
    try {
      const tasks = await Task.find({ completed: false });
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
