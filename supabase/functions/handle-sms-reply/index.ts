// Supabase Edge Function: Handle SMS Reply from User
// Webhook for Twilio to call when user replies to medication SMS
// Updates dose_event status based on reply (TAKEN or SKIP)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Parse Twilio webhook payload
 */
function parseTwilioWebhook(body: string): { from: string; message: string } | null {
  try {
    const params = new URLSearchParams(body);
    const from = params.get('From') || '';
    const message = (params.get('Body') || '').trim().toUpperCase();
    
    return { from, message };
  } catch (error) {
    console.error('Error parsing webhook:', error);
    return null;
  }
}

/**
 * Find most recent pending dose for this user
 */
async function findPendingDoseEvent(userPhone: string): Promise<string | null> {
  try {
    // Get user by phone number from profiles - try multiple formats
    let profile = null;
    
    // Try exact match first
    const { data: exactMatch } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', userPhone)
      .maybeSingle();
    
    if (exactMatch) {
      profile = exactMatch;
    } else {
      // Try with +1 prefix
      const { data: withPrefix } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', '+1' + userPhone)
        .maybeSingle();
      
      if (withPrefix) {
        profile = withPrefix;
      } else {
        // Try with 1 prefix
        const { data: withOne } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', '1' + userPhone)
          .maybeSingle();
        
        profile = withOne;
      }
    }

    if (!profile) {
      console.log('No user found for phone:', userPhone);
      return null;
    }

    // Find most recent pending dose event with confirmation SMS sent
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 2); // Only consider doses from last 2 hours

    const { data: doseEvent } = await supabase
      .from('dose_events')
      .select('id')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .not('confirmation_sms_sent_at', 'is', null)
      .gte('scheduled_at', cutoff.toISOString())
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .single();

    return doseEvent?.id || null;
  } catch (error) {
    console.error('Error finding dose event:', error);
    return null;
  }
}

/**
 * Update dose event status
 */
async function updateDoseStatus(doseEventId: string, status: 'taken' | 'skipped'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('dose_events')
      .update({
        status,
        confirmed_at: new Date().toISOString()
      })
      .eq('id', doseEventId);

    if (error) {
      console.error('Error updating dose:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateDoseStatus:', error);
    return false;
  }
}

/**
 * Main handler
 */
async function handleRequest(req: Request): Promise<Response> {
  try {
    console.log('=== SMS Webhook Received ===');
    
    if (req.method !== 'POST') {
      console.log('Wrong method:', req.method);
      return new Response('Method not allowed', { status: 405 });
    }

    const body = await req.text();
    console.log('Raw body:', body);
    
    const parsed = parseTwilioWebhook(body);

    if (!parsed) {
      console.log('Failed to parse webhook');
      return new Response('Invalid webhook data', { status: 400 });
    }

    const { from, message } = parsed;
    console.log('SMS from:', from, 'Message:', message);

    // Normalize phone number - remove all formatting and country code
    // Twilio sends: +17704018565
    // Database has: 7704018565 or +17704018565
    // We need to match both
    let normalizedPhone = from.replace(/[\s\-\(\)]/g, ''); // Remove spaces, dashes, parens
    if (normalizedPhone.startsWith('+1')) {
      normalizedPhone = normalizedPhone.substring(2); // Remove +1
    } else if (normalizedPhone.startsWith('1') && normalizedPhone.length === 11) {
      normalizedPhone = normalizedPhone.substring(1); // Remove leading 1
    }
    
    console.log('Normalized phone:', normalizedPhone);

    // Check if message is TAKEN or SKIP
    if (!['TAKEN', 'SKIP', 'SKIPPED'].includes(message)) {
      // Send help message
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Please reply TAKEN or SKIP to confirm your medication.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Find the pending dose event for this user
    console.log('Looking for dose event for normalized phone:', normalizedPhone);
    const doseEventId = await findPendingDoseEvent(normalizedPhone);
    console.log('Found dose event ID:', doseEventId);

    if (!doseEventId) {
      console.log('No dose event found for phone:', normalizedPhone);
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>No pending medication found. You may have already confirmed this dose.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Update the dose status
    const status = message === 'TAKEN' ? 'taken' : 'skipped';
    const updated = await updateDoseStatus(doseEventId, status);

    if (updated) {
      const confirmMsg = status === 'taken' 
        ? 'Thank you!' 
        : 'Noted.';

      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${confirmMsg}</Message></Response>`,
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    } else {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error updating status. Please try again.</Message></Response>',
        { status: 200, headers: { 'Content-Type': 'text/xml' } }
      );
    }
  } catch (error) {
    console.error('Error handling SMS reply:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Error processing your reply.</Message></Response>',
      { status: 200, headers: { 'Content-Type': 'text/xml' } }
    );
  }
}

Deno.serve(handleRequest);
