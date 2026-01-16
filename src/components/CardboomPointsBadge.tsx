import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem } from 'lucide-react';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

export const CardboomPointsBadge = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
    });
  }, []);

  const { balance, loading } = useCardboomPoints(userId);

  if (!userId) return null;

  return (
    <motion.button
      onClick={() => navigate('/gems')}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 transition-colors cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Gem className="w-4 h-4 text-sky-400" />
      <span className="text-sm font-medium text-sky-400">
        {loading ? '...' : balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </motion.button>
  );
};
