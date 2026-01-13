import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { legalTranslations } from '@/translations/legal';

const Privacy = () => {
  const { locale } = useLanguage();
  const localizedLegal = (legalTranslations as any)[locale]?.legal || legalTranslations.en.legal;
  const t = localizedLegal.privacy;
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
                    <strong>{legal.companyName}</strong> ("{legal.companyShort}") {t.section1Text}
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    <li><strong>MERSIS No:</strong> {legal.mersis}</li>
                    <li><strong>{t.dataProtectionOfficer || "Data Protection Officer"}:</strong> {legal.privacyEmail}</li>
                    <li><strong>{localizedLegal.terms?.registeredAddress || "Registered Address"}:</strong> {legal.address}</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section2Title}</h2>
                  
                  <h3 className="text-lg font-medium mt-4 mb-2">{t.section2_1Title}</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    {t.section2_1Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>

                  <h3 className="text-lg font-medium mt-4 mb-2">{t.section2_2Title}</h3>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section2_2Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section3Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section3Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section3Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section4Title}</h2>
                  <p className="text-muted-foreground mb-4">{legal.companyShort} {t.section4Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section4Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section5Title}</h2>
                  <p className="text-muted-foreground mb-4">
                    <strong>{t.section5Text}</strong> {t.section5Text2}
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    {t.section5Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section6Title}</h2>
                  <p className="text-muted-foreground">{t.section6Text}</p>
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
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1 mb-4">
                    {t.section8Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">{t.section8Footer}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section9Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section9Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section9Items?.map((item: { name: string; desc: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    {legal.privacyEmail} {t.section9Footer}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section10Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section10Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section10Items?.map((item: string, i: number) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-4">
                    <Link to="/kvkk" className="text-primary hover:underline">{t.section10Footer}</Link>
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section11Title}</h2>
                  <p className="text-muted-foreground mb-4">{t.section11Text}</p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                    {t.section11Items?.map((item: { name: string; duration: string }, i: number) => (
                      <li key={i}><strong>{item.name}:</strong> {item.duration}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section12Title}</h2>
                  <p className="text-muted-foreground">{t.section12Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section13Title}</h2>
                  <p className="text-muted-foreground">{t.section13Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-4">{t.section14Title}</h2>
                  <div className="text-muted-foreground">
                    <p className="font-semibold mb-2">{legal.companyName}</p>
                    <ul className="space-y-1">
                      <li><strong>MERSIS No:</strong> {legal.mersis}</li>
                      <li><strong>{t.dataProtectionOfficer || "Data Protection Officer"}:</strong> {legal.privacyEmail}</li>
                      <li><strong>{localizedLegal.terms?.legalInquiries || "Legal Inquiries"}:</strong> {legal.legalEmail}</li>
                      <li><strong>{localizedLegal.terms?.customerService || "Customer Support"}:</strong> {legal.supportEmail}</li>
                      <li><strong>{localizedLegal.terms?.registeredAddress || "Address"}:</strong> {legal.address}</li>
                    </ul>
                  </div>
                </section>

                <section className="border-t border-border pt-6">
                  <h2 className="text-xl font-semibold mb-4">{localizedLegal.terms?.relatedDocsTitle || "Related Legal Documents"}</h2>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/terms" className="text-primary hover:underline">{localizedLegal.terms?.title || "Terms of Service"}</Link>
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

export default Privacy;
