# EmailJS Setup Guide

## Quick Setup (5 minutes)

### 1. Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for free account (200 emails/month)

### 2. Add Email Service
1. Go to Email Services
2. Add service (Gmail, Outlook, etc.)
3. Connect your email account
4. Copy the **Service ID**

### 3. Create Email Template
1. Go to Email Templates
2. Create new template
3. Use these template variables:
   ```
   From: {{from_name}} <{{from_email}}>
   To: {{to_name}}
   
   Subject: New Contact Form Submission - VibeLog
   
   Message:
   {{message}}
   
   ---
   Sent from VibeLog Contact Form
   ```
4. Copy the **Template ID**

### 4. Get Public Key
1. Go to Account > API Keys
2. Copy your **Public Key**

### 5. Update Environment Variables
Update `.env.local` with your actual values:
```bash
NEXT_PUBLIC_EMAILJS_PUBLIC_KEY=your_actual_public_key
NEXT_PUBLIC_EMAILJS_SERVICE_ID=your_actual_service_id  
NEXT_PUBLIC_EMAILJS_TEMPLATE_ID=your_actual_template_id
```

### 6. Restart Development Server
```bash
npm run dev
```

## Testing
1. Go to `/faq` page
2. Scroll to "Still have questions?" section
3. Click "Contact Support"
4. Fill out and submit form
5. Check your email for the message!

## Notes
- Free tier: 200 emails/month
- Emails come from your connected email account
- No server code required
- Built-in spam protection
- Easy to switch to professional email service later