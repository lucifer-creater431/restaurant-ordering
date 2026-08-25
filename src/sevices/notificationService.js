const twilio = require('twilio');

// Environment variables se credentials fetch honge
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Credentials missing hone par crash se bachane ke liye check
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

async function sendOrderConfirmation(phone, orderId, totalAmount) {
  if (!client) {
    console.log('⚠️ Twilio credentials missing in .env. Skipping SMS/WhatsApp alert.');
    return;
  }

  const messageBody = `🎉 Order Confirmed!\nOrder ID: #${orderId}\nTotal Amount: Rs. ${totalAmount}\nThank you for ordering with us!`;

  try {
    // 1. Send SMS
    if (process.env.TWILIO_PHONE_NUMBER) {
      await client.messages.create({
        body: messageBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`📱 SMS sent to ${phone}`);
    }

    // 2. Send WhatsApp Message
    if (process.env.TWILIO_WHATSAPP_NUMBER) {
      await client.messages.create({
        body: messageBody,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${phone}`
      });
      console.log(`💬 WhatsApp message sent to ${phone}`);
    }
  } catch (error) {
    console.error('❌ Twilio Notification Error:', error.message);
  }
}

module.exports = { sendOrderConfirmation };