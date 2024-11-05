const fs = require('fs').promises;
const path = require('path');
const sgMail = require('@sendgrid/mail');

class Logger {
  constructor() {
    this.logs = [];
    this.startTime = new Date();
    this.logFile = path.join(__dirname, 
      `../../../logs/update_${this.startTime.toISOString().replace(/:/g, '-')}.log`);
    
    // Initialize SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  /**
   * Log a message
   * @param {string} message - Message to log
   * @param {string} level - Log level (info, error, warning)
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // Store in memory
    this.logs.push(formattedMessage);
    
    // Also print to console
    console.log(formattedMessage);
  }

  /**
   * Save logs to file
   */
  async saveToFile() {
    try {
      // Ensure logs directory exists
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      
      // Write logs to file
      await fs.writeFile(this.logFile, this.logs.join('\n'));
      return this.logFile;
    } catch (error) {
      console.error('Error saving logs:', error);
      throw error;
    }
  }

  /**
   * Send email with log attachment
   * @param {string} jobType - Type of job completed
   * @param {boolean} success - Whether the job was successful
   * @param {string} details - Additional details
   */
  async sendEmail(jobType, success, details = '') {
    try {
      const logFile = await this.saveToFile();
      const logContent = await fs.readFile(logFile, 'utf8');

      const subject = `ClinVar Update ${success ? 'Success' : 'Failed'}: ${jobType}`;
      const text = `
ClinVar Update Job: ${jobType}
Status: ${success ? 'Success' : 'Failed'}
Start Time: ${this.startTime}
End Time: ${new Date()}
${details}

Full logs are attached.
`;

      const msg = {
        to: process.env.NOTIFICATION_EMAIL,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        text,
        attachments: [
          {
            content: Buffer.from(logContent).toString('base64'),
            filename: path.basename(this.logFile),
            type: 'text/plain',
            disposition: 'attachment'
          }
        ]
      };

      await sgMail.send(msg);
      this.log(`Email notification sent to ${process.env.NOTIFICATION_EMAIL}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
      throw error;
    }
  }
}

module.exports = Logger;