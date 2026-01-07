import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Speed tier pricing - price is now stored on the order itself
const GEM_RATE = 0.002; // 0.2% in gems (or 0.25% for Pro)

// CBGI Grading system prompt
const CBGI_SYSTEM_PROMPT = `You are CardBoom Grading Index (CBGI), an expert card grading AI. Analyze the provided card images and return a comprehensive grading assessment.

GRADING RUBRIC:
- Centering (20% weight): Front/back centering balance, measure left-right and top-bottom ratios
- Corners (20% weight): Sharpness, wear, whitening, bends
- Edges (20% weight): Smoothness, chips, wear, whitening
- Surface (30% weight): Scratches, print lines, holo scratches, fingerprints, creases
- Eye Appeal (10% weight): Overall visual impression, color vibrancy, presentation

SCORING RULES:
- Score each category from 1.0 to 10.0 in 0.5 increments
- Be CONSERVATIVE: if surface cannot be verified due to glare/low-res/sleeve, cap surface at 8.5
- Final CardBoom Index = weighted average on 0-10 scale with one decimal (e.g., 8.1, 9.5)

PSA RANGE MAPPING (approximate):
- 9.5-10.0: PSA 10 potential
- 8.5-9.4: PSA 9 range
- 7.5-8.4: PSA 8 range
- 6.5-7.4: PSA 7 range
- 5.5-6.4: PSA 6 range
- Below 5.5: PSA 5 or lower

RISK FLAGS (include if applicable):
- GLARE: Reflective glare obscuring surface analysis
- LOW_RES: Image resolution insufficient for detailed analysis
- SLEEVE: Card in sleeve/toploader distorting edge/corner visibility
- PRINT_LINES_RISK: Potential factory print lines detected
- CENTERING_SEVERE: Centering significantly off
- SURFACE_WEAR: Visible surface wear detected
- CORNER_DAMAGE: Notable corner damage present

OUTPUT STRICT JSON ONLY - no markdown, no explanation:`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI grading service not configured - missing OpenAI API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, idempotencyKey } = await req.json();

    if (!orderId || !idempotencyKey) {
      return new Response(
        JSON.stringify({ error: 'Missing orderId or idempotencyKey' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing grading order ${orderId} for user ${user.id}`);

    // Check if already processed with this idempotency key
    const { data: existingOrder, error: checkError } = await supabase
      .from('grading_orders')
      .select('*')
      .eq('id', orderId)
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (checkError) {
      console.error('Order check error:', checkError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingOrder.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If already paid/queued, return success (idempotent)
    if (existingOrder.status !== 'pending_payment') {
      console.log(`Order ${orderId} already processed, status: ${existingOrder.status}`);
      return new Response(
        JSON.stringify({ success: true, order: existingOrder, alreadyProcessed: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet error:', walletError);
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use order's price_usd (based on speed tier)
    const gradingPrice = existingOrder.price_usd || 10;
    
    if (wallet.balance < gradingPrice) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', required: gradingPrice, current: wallet.balance }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atomically deduct balance
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: wallet.balance - gradingPrice, updated_at: new Date().toISOString() })
      .eq('id', wallet.id)
      .eq('balance', wallet.balance); // Optimistic lock

    if (deductError) {
      console.error('Balance deduction error:', deductError);
      return new Response(
        JSON.stringify({ error: 'Failed to process payment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create ledger transaction
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'grading_fee',
        amount: -gradingPrice,
        description: `Card grading fee - Order ${orderId}`,
        reference_id: orderId
      });

    if (txError) {
      console.error('Transaction log error:', txError);
      // Continue anyway, payment was successful
    }

    // Award Cardboom Gems (0.2% of transaction, or 0.25% for Pro)
    try {
      // Check user subscription for Pro rate
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const isPro = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';
      const gemRate = isPro ? 0.0025 : 0.002;
      const gemsEarned = Math.floor(gradingPrice * gemRate * 100); // Convert to gems (1 gem = $0.01)
      
      console.log(`Gem calculation: $${gradingPrice} * ${gemRate} * 100 = ${gemsEarned} gems`);
      
      if (gemsEarned > 0) {
        // Get or create cardboom_points record - use maybeSingle to avoid error if no record
        const { data: existingPoints, error: pointsError } = await supabase
          .from('cardboom_points')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (pointsError) {
          console.error('Error fetching cardboom_points:', pointsError);
        }
        
        if (existingPoints) {
          const { error: updateError } = await supabase
            .from('cardboom_points')
            .update({
              balance: existingPoints.balance + gemsEarned,
              total_earned: existingPoints.total_earned + gemsEarned,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
          
          if (updateError) {
            console.error('Error updating cardboom_points:', updateError);
          } else {
            console.log(`Updated gems for user ${user.id}: +${gemsEarned}`);
          }
        } else {
          const { error: insertError } = await supabase
            .from('cardboom_points')
            .insert({
              user_id: user.id,
              balance: gemsEarned,
              total_earned: gemsEarned,
            });
          
          if (insertError) {
            console.error('Error inserting cardboom_points:', insertError);
          } else {
            console.log(`Created gems record for user ${user.id}: ${gemsEarned}`);
          }
        }
        
        // Log the gems transaction
        const { error: historyError } = await supabase.from('cardboom_points_history').insert({
          user_id: user.id,
          amount: gemsEarned,
          transaction_type: 'earn',
          source: 'grading_payment',
          description: `Earned ${gemsEarned} gems from grading order`,
          reference_id: orderId
        });
        
        if (historyError) {
          console.error('Error logging gems history:', historyError);
        }
        
        console.log(`Awarded ${gemsEarned} gems to user ${user.id} for grading payment`);
      }
    } catch (gemsError) {
      console.error('Error awarding gems:', gemsError);
      // Non-critical, continue
    }

    // Update order to paid
    const { error: updateError } = await supabase
      .from('grading_orders')
      .update({
        status: 'queued',
        paid_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
      // Refund the user
      await supabase
        .from('wallets')
        .update({ balance: wallet.balance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to update order. Payment refunded.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Submit to CBGI (ChatGPT Vision-based grading)
    try {
      console.log('Submitting to CBGI AI grading...');
      console.log('Front image:', existingOrder.front_image_url);
      console.log('Back image:', existingOrder.back_image_url);
      
      // Build image content for ChatGPT Vision
      const imageContent: any[] = [];
      
      if (existingOrder.front_image_url) {
        imageContent.push({
          type: 'image_url',
          image_url: { url: existingOrder.front_image_url, detail: 'high' }
        });
      }
      
      if (existingOrder.back_image_url) {
        imageContent.push({
          type: 'image_url',
          image_url: { url: existingOrder.back_image_url, detail: 'high' }
        });
      }
      
      if (imageContent.length === 0) {
        throw new Error('No images available for grading');
      }

      const userPrompt = `Analyze this trading card and provide a grading assessment. Return ONLY valid JSON matching this exact structure:
{
  "card_name": "Card Name Here",
  "set": "Set Name Here",
  "analysis": {
    "centering": {"score": 8.5, "notes": "Brief notes"},
    "corners": {"score": 8.0, "notes": "Brief notes"},
    "edges": {"score": 8.5, "notes": "Brief notes"},
    "surface": {"score": 8.0, "notes": "Brief notes"},
    "eye_appeal": {"score": 8.5, "notes": "Brief notes"}
  },
  "cardboom_index": 8.2,
  "estimated_psa_range": "PSA 8-9",
  "confidence_level": "Medium",
  "risk_flags": [],
  "grading_disclaimer": "This is the CardBoom Grading Index. We do our best to grade with our fine-tuned AI system powered by Brainbaby."
}`;

      console.log('Calling OpenAI GPT-4o Vision for CBGI grading...');

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: CBGI_SYSTEM_PROMPT },
            { 
              role: 'user', 
              content: [
                { type: 'text', text: userPrompt },
                ...imageContent
              ]
            }
          ],
          max_tokens: 1500,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          // Rate limited - mark for manual review
          await supabase
            .from('grading_orders')
            .update({
              status: 'in_review',
              submitted_at: new Date().toISOString(),
              error_message: 'Rate limited. Will retry shortly.',
            })
            .eq('id', orderId);

          const { data: updatedOrder } = await supabase
            .from('grading_orders')
            .select('*')
            .eq('id', orderId)
            .single();

          return new Response(
            JSON.stringify({ success: true, order: updatedOrder, status: 'in_review' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(`AI grading failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;

      if (!content) {
        console.error('No content in AI response');
        throw new Error('AI returned empty response');
      }

      // Parse JSON from response (handle potential markdown wrapping)
      let cbgiResult: any;
      try {
        let jsonStr = content.trim();
        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.slice(7);
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith('```')) {
          jsonStr = jsonStr.slice(0, -3);
        }
        cbgiResult = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error('Failed to parse AI response:', content);
        await supabase
          .from('grading_orders')
          .update({
            status: 'in_review',
            submitted_at: new Date().toISOString(),
            error_message: 'Failed to parse AI grading response',
            grading_notes: content.substring(0, 500),
          })
          .eq('id', orderId);

        const { data: updatedOrder } = await supabase
          .from('grading_orders')
          .select('*')
          .eq('id', orderId)
          .single();

        return new Response(
          JSON.stringify({ success: true, order: updatedOrder, status: 'in_review' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('CBGI Result:', JSON.stringify(cbgiResult));

      // Extract subgrades
      const analysis = cbgiResult.analysis || {};
      const centeringGrade = analysis.centering?.score || null;
      const cornersGrade = analysis.corners?.score || null;
      const edgesGrade = analysis.edges?.score || null;
      const surfaceGrade = analysis.surface?.score || null;
      const eyeAppealGrade = analysis.eye_appeal?.score || null;

      // Map CBGI score (0-10) to label
      const getGradeLabelFromScore = (score: number): string => {
        if (score >= 9.5) return 'Gem Mint';
        if (score >= 9.0) return 'Mint';
        if (score >= 8.5) return 'Near Mint-Mint';
        if (score >= 8.0) return 'Near Mint';
        if (score >= 7.0) return 'Excellent-Near Mint';
        if (score >= 6.0) return 'Excellent';
        if (score >= 5.0) return 'Very Good-Excellent';
        if (score >= 4.0) return 'Very Good';
        if (score >= 3.0) return 'Good';
        return 'Poor';
      };

      // CBGI score is now 0-10 scale directly
      const cbgiScore = cbgiResult.cardboom_index || 0;
      const finalGrade = Math.round(cbgiScore * 10) / 10;

      // Update order with CBGI results
      const { error: updateGradeError } = await supabase
        .from('grading_orders')
        .update({
          status: 'completed',
          submitted_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          // CBGI specific fields
          cbgi_json: cbgiResult,
          cbgi_score_0_100: finalGrade, // Now stores 0-10 score
          estimated_psa_range: cbgiResult.estimated_psa_range,
          cbgi_confidence: cbgiResult.confidence_level?.toLowerCase() || 'medium',
          cbgi_risk_flags: cbgiResult.risk_flags || [],
          // Standard grade fields
          final_grade: finalGrade,
          grade_label: getGradeLabelFromScore(finalGrade),
          centering_grade: centeringGrade,
          corners_grade: cornersGrade,
          edges_grade: edgesGrade,
          surface_grade: surfaceGrade,
          eye_appeal_grade: eyeAppealGrade,
          // Card identification
          card_name: cbgiResult.card_name || existingOrder.card_name,
          set_name: cbgiResult.set || existingOrder.set_name,
          // Clear error
          error_message: null,
          grading_notes: cbgiResult.grading_disclaimer,
        })
        .eq('id', orderId);

      if (updateGradeError) {
        console.error('Failed to update grading order with results:', updateGradeError);
      } else {
        // Create a card_instance to add to user's collection
        const { error: instanceError } = await supabase
          .from('card_instances')
          .insert({
            owner_user_id: user.id,
            title: cbgiResult.card_name || existingOrder.card_name || 'Graded Card',
            category: existingOrder.category || 'other',
            condition: getGradeLabelFromScore(cbgiScore),
            grade: finalGrade.toFixed(1),
            grading_company: 'CardBoom',
            image_url: existingOrder.front_image_url,
            current_value: 0,
            acquisition_price: gradingPrice,
            acquisition_date: new Date().toISOString(),
            location: 'owner',
            status: 'available',
            source_grading_order_id: orderId,
            market_item_id: existingOrder.market_item_id || null,
          });
        
        if (instanceError) {
          console.error('Failed to create card_instance:', instanceError);
        } else {
          console.log(`Card instance created for user ${user.id} from grading order ${orderId}`);
        }

        // Auto-list if Grade & Flip is enabled
        if (existingOrder.auto_list_enabled) {
          console.log('Auto-list enabled, creating listing...');
          
          // Calculate suggested price based on grade
          const suggestedPrice = existingOrder.auto_list_price || Math.max(10, finalGrade * 15);
          
          // Create listing
          const { data: listing, error: listingError } = await supabase
            .from('listings')
            .insert({
              seller_id: user.id,
              title: cbgiResult.card_name || existingOrder.card_name || 'Graded Card',
              description: `CardBoom Graded: ${finalGrade.toFixed(1)}/10 (${cbgiResult.estimated_psa_range || 'N/A'})`,
              category: existingOrder.category || 'other',
              condition: getGradeLabelFromScore(cbgiScore),
              price: suggestedPrice,
              image_url: existingOrder.front_image_url,
              status: 'active',
              market_item_id: existingOrder.market_item_id || null,
              set_name: existingOrder.set_name,
              set_code: existingOrder.set_code,
              card_number: existingOrder.card_number,
              rarity: existingOrder.rarity,
              language: existingOrder.language,
              cvi_key: existingOrder.cvi_key,
              grading_order_id: orderId,
              certification_status: 'completed',
            })
            .select()
            .single();

          if (listingError) {
            console.error('Failed to auto-list after grading:', listingError);
          } else if (listing) {
            console.log(`Auto-listed graded card: ${listing.id}`);
            
            // Update grading order with listing reference
            await supabase
              .from('grading_orders')
              .update({ listing_created_id: listing.id })
              .eq('id', orderId);

            // Send notification about auto-listing
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  user_id: user.id,
                  type: 'listing_created',
                  title: 'Card Listed! 🎉',
                  body: `Your graded ${cbgiResult.card_name || 'card'} (${finalGrade.toFixed(1)}/10) is now live for $${suggestedPrice.toFixed(2)}`,
                  data: { listing_id: listing.id },
                }),
              });
            } catch (e) {
              console.error('Failed to send auto-list notification:', e);
            }
          }
        }

        // Send grading completion notification (in-app)
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              type: 'grading_complete',
              title: 'Grading Complete! 🎯',
              body: `Your ${cbgiResult.card_name || 'card'} received a ${finalGrade.toFixed(1)}/10 grade (${cbgiResult.estimated_psa_range || 'N/A'})`,
              data: { grading_order_id: orderId },
            }),
          });
        } catch (e) {
          console.error('Failed to send grading completion notification:', e);
        }

        // Send grading completion email
        try {
          // Fetch user email
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, username, full_name')
            .eq('id', user.id)
            .single();

          if (profile?.email) {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                to: profile.email,
                template_key: 'grading_complete',
                user_id: user.id,
                variables: {
                  user_name: profile.full_name || profile.username || 'Collector',
                  card_name: cbgiResult.card_name || 'Your Card',
                  grade: finalGrade.toFixed(1),
                  psa_range: cbgiResult.estimated_psa_range || 'N/A',
                  grade_label: getGradeLabelFromScore(finalGrade),
                  order_url: `https://cardboom.com/grading/orders/${orderId}`,
                },
              }),
            });
            console.log('Grading completion email sent to:', profile.email);
          }
        } catch (emailError) {
          console.error('Failed to send grading completion email:', emailError);
          // Non-critical, continue
        }
      }

      console.log(`Order ${orderId} completed - CBGI Score: ${cbgiScore}/100, Final Grade: ${finalGrade}`);
    } catch (apiError) {
      console.error('CBGI API error:', apiError);
      // Mark as in_review - will be processed by polling or manually
      await supabase
        .from('grading_orders')
        .update({
          status: 'in_review',
          submitted_at: new Date().toISOString(),
          error_message: `API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
        })
        .eq('id', orderId);
    }

    // Fetch updated order
    const { data: updatedOrder } = await supabase
      .from('grading_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Grading submit error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
