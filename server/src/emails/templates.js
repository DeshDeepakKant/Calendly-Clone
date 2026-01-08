export const getBookingConfirmationClient = (booking) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; }
        .header { background-color: #006BFF; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Booking Confirmed</h2>
        </div>
        <div class="content">
            <p>Hi ${booking.inviteeName},</p>
            <p>Your meeting has been scheduled successfully. Here are the details:</p>
            
            <div class="details">
                <p><strong>Event:</strong> ${booking.eventType.title}</p>
                <p><strong>When:</strong> ${new Date(booking.startTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
})}</p>
                ${booking.eventType.description ? `<p><strong>Description:</strong> ${booking.eventType.description}</p>` : ''}
            </div>

            <p>Need to make changes? <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/cancel/${booking.id}">Cancel or Reschedule</a></p>
        </div>
        <div class="footer">
            <p>Powered by Calendly Clone</p>
        </div>
    </div>
</body>
</html>
`;

export const getBookingNotificationHost = (booking) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; }
        .header { background-color: #eee; color: #333; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>New Booking Received</h2>
        </div>
        <div class="content">
            <p>Usage Notification: <strong>${booking.inviteeName}</strong> has scheduled a meeting with you.</p>
            
            <div class="details">
                <p><strong>Event:</strong> ${booking.eventType.title}</p>
                <p><strong>Invitee:</strong> ${booking.inviteeName} (${booking.inviteeEmail})</p>
                <p><strong>When:</strong> ${new Date(booking.startTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
})}</p>
                <p><strong>Notes:</strong> ${booking.customAnswers || 'None'}</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

export const getCancellationNotice = (booking) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; }
        .header { background-color: #d9534f; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .details { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Meeting Cancelled</h2>
        </div>
        <div class="content">
            <p>The following meeting has been cancelled:</p>
            
            <div class="details">
                <p><strong>Event:</strong> ${booking.eventType.title}</p>
                <p><strong>With:</strong> ${booking.inviteeName}</p>
                <p><strong>Original Time:</strong> ${new Date(booking.startTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
})}</p>
            </div>
        </div>
    </div>
</body>
</html>
`;
