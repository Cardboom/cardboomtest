import { Github, Twitter, MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="border-t border-border/50 py-12 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold">C</span>
              </div>
              <span className="font-display text-lg font-bold">
                CARD<span className="text-primary">BOOM</span>
              </span>
            </div>
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
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.nbaCards}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.footballCards}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.tcg}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.figures}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.company}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.about}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.careers}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.blog}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.press}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.support}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.helpCenter}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.safety}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.terms}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t.footer.privacy}</a></li>
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
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-5 h-5" />
            </a>
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
