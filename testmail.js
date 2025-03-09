const fetch = require('node-fetch');
require('dotenv').config();

async function testEmail() {
    try {
        const url = 'https://api.emailjs.com/api/v1.0/email/send';
        const templateParams = {
            to_name: 'Nevape',
            from_name: 'Support System',
            ticket_title: 'Test Ticket',
            ticket_description: 'This is a test ticket description',
            ticket_status: 'Open',
            ticket_id: '12345',
            to_email: 'ali1999920001@gmail.com',
            reply_to: 'support@example.com'
        };

        const data = {
            service_id: process.env.EMAILJS_SERVICE_ID,
            template_id: process.env.EMAILJS_TEMPLATE_ID,
            user_id: process.env.EMAILJS_PUBLIC_KEY,
            accessToken: process.env.EMAILJS_PRIVATE_KEY,
            template_params: templateParams
        };

        console.log('Sending email with data:', templateParams);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost'
            },
            body: JSON.stringify(data)
        });

        // Check if response is OK without trying to parse JSON
        if (response.ok) {
            const responseText = await response.text();
            console.log('SUCCESS! Email sent. Response:', responseText);
        } else {
            // Only try to parse as JSON if not OK
            try {
                const errorData = await response.json();
                console.log('ERROR:', errorData);
            } catch (jsonError) {
                const errorText = await response.text();
                console.log('ERROR:', response.status, errorText);
            }
        }
    } catch (err) {
        console.log('ERROR:', err);
    }
}

// Run the test
console.log('Starting email test...');
testEmail();