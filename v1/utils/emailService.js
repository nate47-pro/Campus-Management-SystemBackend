const nodemailer = require('nodemailer');
const pool = require('../config/db');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendRegistrationEmail(userId, eventId, status) {
  try {
    // Get user and event details
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const event = await pool.query('SELECT title, event_date FROM events WHERE id = $1', [eventId]);

    const subject = status === 'confirmed'
      ? 'Event Registration Confirmed'
      : 'Added to Event Waitlist';

    const message = status === 'confirmed'
      ? `Your registration for ${event.rows[0].title} has been confirmed.`
      : `You have been added to the waitlist for ${event.rows[0].title}.`;

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.rows[0].email,
      subject,
      text: message,
      html: `
        <h2>${subject}</h2>
        <p>${message}</p>
        <p>Event Date: ${new Date(event.rows[0].event_date).toLocaleString()}</p>
      `,
    });
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

async function sendEmail(to, type, message) {
    const templates = {
      EVENT_UPDATE: {
        subject: 'Event Update',
        template: (msg) => `
          <h2>Event Update Notification</h2>
          <p>${msg}</p>
        `
      },
      EVENT_REMINDER: {
        subject: 'Event Reminder',
        template: (msg) => `
          <h2>Upcoming Event Reminder</h2>
          <p>${msg}</p>
        `
      },
      REGISTRATION_CONFIRMATION: {
        subject: 'Registration Confirmed',
        template: (msg) => `
          <h2>Registration Confirmation</h2>
          <p>${msg}</p>
        `
    },
    WAITLIST_UPDATE: {
      subject: 'Waitlist Status Update',
      template: (msg) => `
        <h2>Waitlist Update</h2>
        <p>${msg}</p>
      `
    }
  };

  const template = templates[type] || {
    subject: 'Notification',
    template: (msg) => `<p>${msg}</p>`
  };
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: template.subject,
      html: template.template(message)
    });
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}

module.exports = {
    sendRegistrationEmail,
    sendEmail
  };