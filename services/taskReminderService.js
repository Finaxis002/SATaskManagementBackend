
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
  
  

const isMorningReminder = (currentHourIST === 13 && currentMinuteIST >= 55) || (currentHourIST === 14 && currentMinuteIST <= 5);
const isEveningReminder = (currentHourIST === 16 && currentMinuteIST >= 55) || (currentHourIST === 17 && currentMinuteIST <= 5);
const isSixPMReminder = (currentHourIST === 17 && currentMinuteIST >= 55) || (currentHourIST === 18 && currentMinuteIST <= 5);
const isSixThirtyPMReminder = (currentHourIST === 18 && currentMinuteIST >= 25) && (currentMinuteIST <= 35);


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

