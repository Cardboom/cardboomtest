import { MessageCircle, MapPin } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link, useNavigate } from 'react-router-dom';
import cardboomLogo from '@/assets/cardboom-logo.png';

// X (formerly Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Footer link that scrolls to top on navigation
const FooterLink = ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate(to);
  };
  
  return (
    <a href={to} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

export const Footer = () => {
  const { t } = useLanguage();
  
  return (
    <footer className="border-t border-border/50 py-12 mt-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <FooterLink to="/" className="flex items-center gap-2 mb-4">
              <img src={cardboomLogo} alt="CardBoom" width={192} height={192} className="h-48 w-auto" />
            </FooterLink>
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
              <li><FooterLink to="/catalog?category=pokemon" className="hover:text-foreground transition-colors">Pokémon TCG</FooterLink></li>
              <li><FooterLink to="/catalog?category=mtg" className="hover:text-foreground transition-colors">Magic: The Gathering</FooterLink></li>
              <li><FooterLink to="/catalog?category=yugioh" className="hover:text-foreground transition-colors">Yu-Gi-Oh!</FooterLink></li>
              <li><FooterLink to="/catalog?category=one-piece" className="hover:text-foreground transition-colors">One Piece TCG</FooterLink></li>
              <li><FooterLink to="/catalog?category=lorcana" className="hover:text-foreground transition-colors">Disney Lorcana</FooterLink></li>
              <li><FooterLink to="/catalog?category=sports-nba" className="hover:text-foreground transition-colors">{t.footer.nbaCards}</FooterLink></li>
              <li><FooterLink to="/catalog?category=sports-football" className="hover:text-foreground transition-colors">Football Cards</FooterLink></li>
              <li><FooterLink to="/catalog?category=sports-fifa" className="hover:text-foreground transition-colors">FIFA Cards</FooterLink></li>
              <li><FooterLink to="/catalog?category=figures" className="hover:text-foreground transition-colors">{t.footer.figures}</FooterLink></li>
              <li><FooterLink to="/trades" className="hover:text-foreground transition-colors">{t.nav.tradesOffers}</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.company}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><FooterLink to="/about" className="hover:text-foreground transition-colors">{t.footer.about}</FooterLink></li>
              <li><FooterLink to="/careers" className="hover:text-foreground transition-colors">{t.footer.careers}</FooterLink></li>
              <li><FooterLink to="/creators" className="hover:text-foreground transition-colors">{t.footer.creatorsAmbassadors}</FooterLink></li>
              <li><FooterLink to="/pricing" className="hover:text-foreground transition-colors">{t.footer.pricingPro}</FooterLink></li>
              <li className="pl-4 text-xs opacity-70">Lite: $9.99/mo • Pro: $25/mo • Enterprise: $50/mo</li>
              <li><FooterLink to="/blog" className="hover:text-foreground transition-colors">{t.footer.blog}</FooterLink></li>
              <li><FooterLink to="/press" className="hover:text-foreground transition-colors">{t.footer.press}</FooterLink></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">{t.footer.support}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><FooterLink to="/help" className="hover:text-foreground transition-colors">{t.footer.helpCenter}</FooterLink></li>
              <li><FooterLink to="/safety" className="hover:text-foreground transition-colors">{t.footer.safety}</FooterLink></li>
              <li><FooterLink to="/api" className="hover:text-foreground transition-colors">{t.footer.apiDevelopers}</FooterLink></li>
              <li><FooterLink to="/terms" className="hover:text-foreground transition-colors">{t.footer.terms}</FooterLink></li>
              <li><FooterLink to="/privacy" className="hover:text-foreground transition-colors">{t.footer.privacy}</FooterLink></li>
              <li><FooterLink to="/kvkk" className="hover:text-foreground transition-colors">KVKK</FooterLink></li>
              <li><FooterLink to="/kullanici-sozlesmesi" className="hover:text-foreground transition-colors">{t.footer.userAgreement}</FooterLink></li>
              <li><FooterLink to="/mesafeli-satis-sozlesmesi" className="hover:text-foreground transition-colors">{t.footer.distanceSales}</FooterLink></li>
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
            <a href="https://x.com/cardboomcom" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <XIcon className="w-5 h-5" />
            </a>
            <a href="https://discord.gg/cardboom" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};