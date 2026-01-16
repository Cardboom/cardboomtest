import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardboomPoints } from '@/hooks/useCardboomPoints';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { BoomCoinIcon } from '@/components/icons/BoomCoinIcon';

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
      onClick={() => navigate('/coins')}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <BoomCoinIcon className="w-4 h-4 text-amber-400" />
      <span className="text-sm font-medium text-amber-400">
        {loading ? '...' : balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </span>
    </motion.button>
  );
};
