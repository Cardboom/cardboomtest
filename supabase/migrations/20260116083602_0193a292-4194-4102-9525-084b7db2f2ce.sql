-- Add more animated and cool backgrounds
INSERT INTO public.profile_backgrounds (name, type, css_value, unlock_level, xp_cost, is_premium) VALUES
-- Free level-based unlocks
('Cosmic Dust', 'gradient', 'linear-gradient(135deg, hsl(250, 40%, 12%) 0%, hsl(280, 30%, 8%) 50%, hsl(220, 50%, 15%) 100%)', 2, 0, false),
('Aurora Night', 'gradient', 'linear-gradient(180deg, hsl(170, 50%, 10%) 0%, hsl(200, 60%, 15%) 50%, hsl(280, 40%, 12%) 100%)', 4, 0, false),
('Ember Glow', 'gradient', 'linear-gradient(135deg, hsl(15, 70%, 12%) 0%, hsl(350, 50%, 10%) 100%)', 6, 0, false),

-- XP purchasable backgrounds with animations
('Pulse Wave', 'animated', 'linear-gradient(90deg, hsl(200, 100%, 20%), hsl(180, 80%, 15%), hsl(220, 100%, 25%))', 8, 300, false),
('Matrix Rain', 'animated', 'linear-gradient(180deg, hsl(120, 100%, 5%) 0%, hsl(140, 80%, 10%) 50%, hsl(100, 60%, 8%) 100%)', 10, 500, false),
('Cyber Punk', 'animated', 'linear-gradient(135deg, hsl(300, 100%, 20%), hsl(180, 100%, 15%), hsl(330, 80%, 18%))', 12, 600, false),
('Plasma Storm', 'animated', 'linear-gradient(270deg, hsl(260, 100%, 25%), hsl(290, 100%, 20%), hsl(320, 100%, 25%))', 15, 800, false),
('Galaxy Swirl', 'animated', 'linear-gradient(45deg, hsl(250, 80%, 15%), hsl(280, 70%, 20%), hsl(310, 60%, 18%), hsl(340, 50%, 15%))', 18, 1000, false),
('Lightning Field', 'animated', 'linear-gradient(135deg, hsl(210, 100%, 10%), hsl(260, 100%, 20%), hsl(200, 100%, 15%))', 22, 1800, false),
('Solar Flare', 'animated', 'linear-gradient(180deg, hsl(30, 100%, 20%), hsl(45, 100%, 30%), hsl(15, 100%, 15%))', 25, 2000, false),

-- Premium animated backgrounds
('Diamond Dust', 'animated', 'linear-gradient(135deg, hsl(200, 20%, 20%), hsl(180, 30%, 25%), hsl(220, 25%, 22%))', 28, 3000, true),
('Void Walker', 'animated', 'linear-gradient(180deg, hsl(270, 100%, 5%), hsl(280, 80%, 10%), hsl(260, 100%, 8%))', 30, 4000, true),
('Celestial Fire', 'animated', 'linear-gradient(45deg, hsl(15, 100%, 25%), hsl(45, 100%, 35%), hsl(350, 100%, 20%), hsl(30, 100%, 30%))', 35, 6000, true),
('Quantum Shift', 'animated', 'linear-gradient(270deg, hsl(180, 100%, 15%), hsl(240, 100%, 20%), hsl(300, 100%, 15%), hsl(60, 100%, 20%))', 40, 8000, true),
('Legendary Aura', 'animated', 'linear-gradient(135deg, hsl(45, 100%, 30%), hsl(30, 100%, 25%), hsl(50, 90%, 35%), hsl(40, 100%, 28%))', 50, 10000, true)
ON CONFLICT DO NOTHING;