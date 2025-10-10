const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

async function sendEmailViaBrevo(formData: ContactFormData, toEmail: string, fromEmail: string): Promise<boolean> {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');

  if (!brevoApiKey) {
    throw new Error('BREVO_API_KEY not configured');
  }

  const emailBody = `
Nouveau message depuis le formulaire de contact :

Nom : ${formData.name}
Email : ${formData.email}
Sujet : ${formData.subject}

Message :
${formData.message}
`;

  const emailPayload = {
    sender: {
      name: "Site Web",
      email: fromEmail,
    },
    to: [
      {
        email: toEmail,
      },
    ],
    replyTo: {
      email: formData.email,
      name: formData.name,
    },
    subject: `[Contact] ${formData.subject}`,
    textContent: emailBody,
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo API Error:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { name, email, subject, message }: ContactFormData = await req.json();

    console.log('Contact form submission:', { name, email, subject });

    const toEmail = Deno.env.get('CONTACT_EMAIL_TO');
    const fromEmail = Deno.env.get('CONTACT_EMAIL_FROM');
    
    if (!toEmail || !fromEmail) {
      throw new Error('Email configuration missing');
    }

    const emailSent = await sendEmailViaBrevo({ name, email, subject, message }, toEmail, fromEmail);

    if (!emailSent) {
      throw new Error('Failed to send email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Message envoyé avec succès',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur lors du traitement du message',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});