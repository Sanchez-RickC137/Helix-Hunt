const sgMail = require('@sendgrid/mail');

/**
 * Sends password reset email using SendGrid
 * @param {string} email - Recipient email address
 * @param {string} resetCode - Generated reset code
 * @returns {Promise} SendGrid API response
 */
exports.sendResetEmail = async (email, resetCode) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Password Reset Code - HelixHunt',
    text: `Your password reset code is: ${resetCode}\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset Code</h2>
        <p>Your password reset code is: <strong style="font-size: 1.2em; color: #4F46E5;">${resetCode}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p style="color: #666;">If you did not request this code, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p style="font-size: 0.8em; color: #666;">This is an automated message from HelixHunt. Please do not reply to this email.</p>
      </div>
    `
  };

  try {
    const response = await sgMail.send(msg);
    console.log('Reset code email sent successfully');
    return response;
  } catch (error) {
    console.error('SendGrid error:', {
      message: error.message,
      response: error.response?.body,
      code: error.code
    });
    throw error;
  }
};

/**
 * Sends notification email for query results
 * @param {string} email - Recipient email address
 * @param {Object} queryDetails - Details of the executed query
 * @returns {Promise} SendGrid API response
 */
exports.sendQueryNotification = async (email, queryDetails) => {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: 'Query Results Available - HelixHunt',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Query Results Ready</h2>
        <p>Your query has been processed and results are now available.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Query Details:</h3>
          <ul style="list-style-type: none; padding-left: 0;">
            ${queryDetails.terms ? `<li>Search Terms: ${queryDetails.terms}</li>` : ''}
            ${queryDetails.timestamp ? `<li>Executed: ${new Date(queryDetails.timestamp).toLocaleString()}</li>` : ''}
          </ul>
        </div>
        <p>Log in to your HelixHunt account to view the complete results.</p>
        <hr style="margin: 20px 0;">
        <p style="font-size: 0.8em; color: #666;">This is an automated message from HelixHunt. Please do not reply to this email.</p>
      </div>
    `
  };

  try {
    const response = await sgMail.send(msg);
    console.log('Query notification email sent successfully');
    return response;
  } catch (error) {
    console.error('SendGrid error:', {
      message: error.message,
      response: error.response?.body,
      code: error.code
    });
    throw error;
  }
};