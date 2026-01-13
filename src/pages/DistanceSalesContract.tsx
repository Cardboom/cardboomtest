import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { legalTranslations } from "@/translations/legal";

const DistanceSalesContract = () => {
  const { locale } = useLanguage();
  const localizedLegal = (legalTranslations as any)[locale]?.legal || legalTranslations.en.legal;
  const t = localizedLegal.distanceSales || legalTranslations.tr.legal.distanceSales;
  const legal = legalTranslations.en.legal; // Company info always from EN

  return (
    <>
      <Helmet>
        <title>{t.title} | CardBoom</title>
        <meta name="description" content={t.metaDescription} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-foreground">
                {t.title}
              </CardTitle>
              <p className="text-muted-foreground">{localizedLegal.lastUpdated || 'Last updated'}: 13 January 2026</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-6">
              {/* Section 1 - Parties */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section1Title}</h2>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section1_1Title}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>{t.sellerTitle}:</strong> {legal.companyName}</li>
                  <li><strong>MERSIS:</strong> {legal.mersis}</li>
                  <li><strong>{t.sellerAddress}:</strong> {legal.address}</li>
                  <li><strong>{t.sellerEmail}:</strong> {legal.supportEmail}</li>
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section1_2Title}</h3>
                <p className="text-muted-foreground">{t.buyerInfoText}</p>
              </section>

              {/* Section 2 - Subject */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section2Title}</h2>
                <p className="text-muted-foreground">{t.section2Text}</p>
              </section>

              {/* Section 3 - Products */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section3Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section3Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section3Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* Section 4 - General Terms */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section4Title}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section4Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* Section 5 - Delivery */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section5Title}</h2>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section5_1Title}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section5_1Items?.map((item: any, i: number) => (
                    <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                  ))}
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section5_2Title}</h3>
                <p className="text-muted-foreground">{t.section5_2Text}</p>
              </section>

              {/* Section 6 - Right of Withdrawal */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section6Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section6Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section6Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section6_1Title}</h3>
                <p className="text-muted-foreground mb-2">{t.section6_1Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section6_1Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* Section 7 - Payment and Refund */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section7Title}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section7Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* Section 8 - Warranty */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section8Title}</h2>
                <p className="text-muted-foreground">{t.section8Text}</p>
              </section>

              {/* Section 9 - Jurisdiction */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section9Title}</h2>
                <p className="text-muted-foreground">{t.section9Text}</p>
              </section>

              {/* Section 10 - Effective Date */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section10Title}</h2>
                <p className="text-muted-foreground">{t.section10Text}</p>
              </section>

              {/* Section 11 - Contact */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section11Title}</h2>
                <p className="text-muted-foreground">
                  {t.section11Text} <strong>{legal.supportEmail}</strong> {t.section11Text2}
                </p>
              </section>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default DistanceSalesContract;