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
              <img src={cardboomLogo} alt="CardBoom" className="h-48 w-auto" />
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
              <li><Link to="/markets?category=pokemon" className="hover:text-foreground transition-colors">Pokémon TCG</Link></li>
              <li><Link to="/markets?category=mtg" className="hover:text-foreground transition-colors">Magic: The Gathering</Link></li>
              <li><Link to="/markets?category=yugioh" className="hover:text-foreground transition-colors">Yu-Gi-Oh!</Link></li>
              <li><Link to="/markets?category=one-piece" className="hover:text-foreground transition-colors">One Piece TCG</Link></li>
              <li><Link to="/markets?category=lorcana" className="hover:text-foreground transition-colors">Disney Lorcana</Link></li>
              <li><Link to="/markets?category=sports-nba" className="hover:text-foreground transition-colors">{t.footer.nbaCards}</Link></li>
              <li><Link to="/markets?category=figures" className="hover:text-foreground transition-colors">{t.footer.figures}</Link></li>
              <li><Link to="/trades" className="hover:text-foreground transition-colors">{t.nav.tradesOffers}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.company}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground transition-colors">{t.footer.about}</Link></li>
              <li><Link to="/careers" className="hover:text-foreground transition-colors">{t.footer.careers}</Link></li>
              <li><Link to="/creators" className="hover:text-foreground transition-colors">{t.footer.creatorsAmbassadors}</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground transition-colors">{t.footer.pricingPro}</Link></li>
              <li><Link to="/blog" className="hover:text-foreground transition-colors">{t.footer.blog}</Link></li>
              <li><Link to="/press" className="hover:text-foreground transition-colors">{t.footer.press}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.support}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/help" className="hover:text-foreground transition-colors">{t.footer.helpCenter}</Link></li>
              <li><Link to="/safety" className="hover:text-foreground transition-colors">{t.footer.safety}</Link></li>
              <li><Link to="/api" className="hover:text-foreground transition-colors">{t.footer.apiDevelopers}</Link></li>
              <li><Link to="/terms" className="hover:text-foreground transition-colors">{t.footer.terms}</Link></li>
              <li><Link to="/privacy" className="hover:text-foreground transition-colors">{t.footer.privacy}</Link></li>
              <li><Link to="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link></li>
              <li><Link to="/kullanici-sozlesmesi" className="hover:text-foreground transition-colors">{t.footer.userAgreement}</Link></li>
              <li><Link to="/mesafeli-satis-sozlesmesi" className="hover:text-foreground transition-colors">{t.footer.distanceSales}</Link></li>
            </ul>
          </div>
        </div>

        {/* Trademark Disclaimer */}
        <div className="mb-6 pt-6 border-t border-border/30">
          <p className="text-xs text-muted-foreground/70 leading-relaxed max-w-4xl">
            All Pokémon trademarks, logos, and images are owned by The Pokémon Company. Magic: The Gathering and MTG are trademarks of Wizards of the Coast LLC. Yu-Gi-Oh! is a trademark of Konami Holdings Corporation. One Piece is a trademark of Shueisha Inc. and Toei Animation. Disney Lorcana is a trademark of Disney. CardBoom is an independent marketplace for authentic collectible cards; scanned images are used solely for identification purposes. We are not affiliated with, endorsed by, or sponsored by any of these companies or their related entities.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-6 border-t border-border/50">
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