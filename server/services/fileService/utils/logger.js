const fs = require('fs').promises;
const path = require('path');
const sgMail = require('@sendgrid/mail');

class Logger {
  constructor() {
    this.logs = [];
    this.startTime = new Date();
    this.logFile = path.join(__dirname, 
      `../../../logs/update_${this.startTime.toISOString().replace(/:/g, '-')}.log`);
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    this.logs.push(formattedMessage);
    console.log(formattedMessage);
  }

  async saveToFile() {
    try {
      await fs.mkdir(path.dirname(this.logFile), { recursive: true });
      await fs.writeFile(this.logFile, this.logs.join('\n'));
      return this.logFile;
    } catch (error) {
      console.error('Error saving logs:', error);
      throw error;
    }
  }

  // Modified to handle missing SendGrid credentials
  async sendEmail(jobType, success, details = '') {
    try {
      const logFile = await this.saveToFile();
      console.log(`Job: ${jobType}, Status: ${success ? 'Success' : 'Failed'}`);
      console.log(`Start Time: ${this.startTime}`);
      console.log(`End Time: ${new Date()}`);
      console.log(details);
      console.log(`Logs saved to: ${logFile}`);
    } catch (error) {
      console.error('Error handling logs:', error);
    }
  }
}

module.exports = Logger;