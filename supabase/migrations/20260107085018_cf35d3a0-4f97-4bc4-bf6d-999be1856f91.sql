-- Add grading_complete email template
INSERT INTO public.email_templates (template_key, subject, html_content, is_active)
VALUES (
  'grading_complete',
  '🎯 Your Card Has Been Graded - {{grade}}/10!',
  '<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 20px 0; }
    .logo { font-size: 28px; font-weight: bold; color: #3CBCC3; }
    .grade-card { background: linear-gradient(135deg, #3CBCC3 0%, #2a9d8f 100%); color: white; border-radius: 16px; padding: 30px; text-align: center; margin: 20px 0; }
    .grade-score { font-size: 64px; font-weight: bold; margin: 10px 0; }
    .grade-label { font-size: 18px; opacity: 0.9; }
    .psa-estimate { background: rgba(255,255,255,0.2); border-radius: 8px; padding: 10px 20px; display: inline-block; margin-top: 15px; }
    .card-name { font-size: 20px; margin-bottom: 5px; }
    .cta-button { display: inline-block; background: #3CBCC3; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; color: #888; font-size: 12px; padding: 20px 0; border-top: 1px solid #eee; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">CardBoom</div>
    </div>
    
    <p>Hi {{user_name}},</p>
    
    <p>Great news! Your card grading is complete. 🎉</p>
    
    <div class="grade-card">
      <div class="card-name">{{card_name}}</div>
      <div class="grade-score">{{grade}}</div>
      <div class="grade-label">{{grade_label}}</div>
      <div class="psa-estimate">Estimated {{psa_range}}</div>
    </div>
    
    <p>Your card has been analyzed by our AI grading system and assigned a CardBoom Index score.</p>
    
    <p style="text-align: center;">
      <a href="{{order_url}}" class="cta-button">View Full Results</a>
    </p>
    
    <div class="footer">
      <p>CardBoom - AI-Powered Card Grading</p>
      <p>© 2025 CardBoom. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  true
) ON CONFLICT (template_key) DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  is_active = true;