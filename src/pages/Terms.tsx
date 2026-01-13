import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { legalTranslations } from '@/translations/legal';

const Terms = () => {
  const { locale } = useLanguage();
  const localizedLegal = (legalTranslations as any)[locale]?.legal || legalTranslations.en.legal;
  const t = localizedLegal.terms;
  const legal = localizedLegal;
  
  return (
    <>
      <Helmet>
        <title>{t.title} | CardBoom</title>
        <meta name="description" content={t.metaDescription} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />

        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge className="mb-4">{t.badge}</Badge>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                {t.title}
              </h1>
              <p className="text-muted-foreground">{legal.lastUpdated}: January 13, 2026</p>
              <p className="text-sm text-muted-foreground mt-2">{legal.effectiveDate}: January 13, 2026</p>
            </div>

            <Card>
              <CardContent className="py-8 prose prose-invert max-w-none space-y-6">
                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section1Title}</h2>
                  <p className="text-muted-foreground mb-4">
                    {t.section1Text} <strong>{legal.companyName}</strong> ("{legal.companyShort}") {t.section1CompanyInfo}
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>MERSIS No:</strong> {legal.mersis}</li>
                    <li><strong>{t.registeredAddress || "Registered Address"}:</strong> {legal.address}</li>
                    <li><strong>E-mail:</strong> {legal.legalEmail}</li>
                    <li><strong>{t.customerService || "Customer Service"}:</strong> {legal.supportEmail}</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section2Title}</h2>
                  <p className="text-muted-foreground mb-4">
                    {t.section2Text1} <Link to="/privacy" className="text-primary hover:underline">{localizedLegal.privacy?.title || "Privacy Policy"}</Link>, <Link to="/kvkk" className="text-primary hover:underline">KVKK</Link>, <Link to="/mesafeli-satis-sozlesmesi" className="text-primary hover:underline">{localizedLegal.distanceSales?.title || "Distance Sales Contract"}</Link>.
                  </p>
                  <p className="text-muted-foreground">
                    <strong>{t.section2Text2}</strong> {t.section2Text3}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section3Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section3Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    {t.section3Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">{t.section3Footer}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section4Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section4Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section4Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section5Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section5Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    {t.section5Items?.map((item: { name: string; value: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.value}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">{t.section5Footer}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section6Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section6Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section6Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section7Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section7Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section7Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section8Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section8Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section8Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section9Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section9Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    {t.section9Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">{t.section9Footer}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section10Title}</h2>
                  <p className="text-muted-foreground mb-4"><strong>{t.section10Text}</strong></p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    {t.section10Items?.map((item: string, i: number) => (
                      <li key={i}>{i === 0 ? `${legal.companyShort} ${item}` : item}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section11Title}</h2>
                  <p className="text-muted-foreground">
                    {t.section11Text} {legal.companyShort}, {t.section11Text2}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section12Title}</h2>
                  <p className="text-muted-foreground mb-4">
                    {t.section12Text1} {legal.companyShort}. {t.section12Text2}
                  </p>
                  <p className="text-muted-foreground">
                    <strong>{t.section12Trademarks}</strong> {t.section12TrademarksText}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section13Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section13Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section13Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section14Title}</h2>
                  <p className="text-muted-foreground">{t.section14Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section15Title}</h2>
                  <p className="text-muted-foreground">{t.section15Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section16Title}</h2>
                  <p className="text-muted-foreground">
                    {legal.companyShort} {t.section16Text}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section17Title}</h2>
                  <div className="text-muted-foreground">
                    <p className="font-semibold mb-2">{legal.companyName}</p>
                    <ul className="space-y-1">
                      <li><strong>MERSIS No:</strong> {legal.mersis}</li>
                      <li><strong>{t.legalInquiries || "Legal Inquiries"}:</strong> {legal.legalEmail}</li>
                      <li><strong>{t.customerService || "Customer Support"}:</strong> {legal.supportEmail}</li>
                      <li><strong>{t.dataProtection || "Data Protection"}:</strong> {legal.privacyEmail}</li>
                      <li><strong>{t.registeredAddress || "Address"}:</strong> {legal.address}</li>
                    </ul>
                  </div>
                </section>

                <section className="border-t border-border pt-6">
                  <h2 className="text-xl font-semibold mb-4">{t.relatedDocsTitle}</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/privacy" className="text-primary hover:underline">{localizedLegal.privacy?.title || "Privacy Policy"}</Link>
                    </li>
                    <li>
                      <Link to="/kvkk" className="text-primary hover:underline">{localizedLegal.kvkk?.title || "KVKK Privacy Notice"}</Link>
                    </li>
                    <li>
                      <Link to="/mesafeli-satis-sozlesmesi" className="text-primary hover:underline">{localizedLegal.distanceSales?.title || "Distance Sales Contract"}</Link>
                    </li>
                  </ul>
                </section>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Terms;
