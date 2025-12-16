import { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Redirect component for legacy card URLs
 * Redirects /:category/:slug to /cards/:category/:slug
 */
const LegacyCardRedirect = () => {
  const { category, slug, grade } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Build new URL path
    let newPath = `/cards/${category}/${slug}`;
    
    // Convert grade path param to query param
    const searchParams = new URLSearchParams(location.search);
    if (grade) {
      searchParams.set('grade', grade.toLowerCase());
    }
    
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${newPath}?${queryString}` : newPath;
    
    // 301-style redirect (replace in history)
    navigate(fullPath, { replace: true });
  }, [category, slug, grade, navigate, location.search]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default LegacyCardRedirect;
