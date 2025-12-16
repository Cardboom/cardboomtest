import { Github, Twitter, MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import cardboomLogo from '@/assets/cardboom-logo.png';

export const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="border-t border-border/50 py-12 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={cardboomLogo} alt="CardBoom" className="h-12 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              {t.footer.tagline}
            </p>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t.footer.address}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.marketplace}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/explorer?category=basketball" className="hover:text-foreground transition-colors">{t.footer.nbaCards}</Link></li>
              <li><Link to="/explorer?category=football" className="hover:text-foreground transition-colors">{t.footer.footballCards}</Link></li>
              <li><Link to="/explorer?category=pokemon" className="hover:text-foreground transition-colors">{t.footer.tcg}</Link></li>
              <li><Link to="/explorer?category=figures" className="hover:text-foreground transition-colors">{t.footer.figures}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.company}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t.footer.about}</Link></li>
              <li><Link to="/careers" className="hover:text-foreground transition-colors">{t.footer.careers}</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">{t.footer.blog}</Link></li>
              <li><Link to="/press" className="hover:text-foreground transition-colors">{t.footer.press}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.support}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground transition-colors">{t.footer.helpCenter}</Link></li>
              <li><Link to="/safety" className="hover:text-foreground transition-colors">{t.footer.safety}</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{t.footer.terms}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t.footer.privacy}</Link></li>
              <li><Link to="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link></li>
              <li><Link to="/kullanici-sozlesmesi" className="hover:text-foreground transition-colors">Kullanıcı Sözleşmesi</Link></li>
              <li><Link to="/mesafeli-satis-sozlesmesi" className="hover:text-foreground transition-colors">Mesafeli Satış</Link></li>
              <li><Link to="/api" className="hover:text-foreground transition-colors">API</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border/50">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <p className="text-sm font-medium text-foreground">
              Brainbaby Bilişim A.Ş.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.footer.copyright}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://twitter.com/cardboom" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="https://discord.gg/cardboom" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-5 h-5" />
            </a>
            <a href="https://github.com/cardboom" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};