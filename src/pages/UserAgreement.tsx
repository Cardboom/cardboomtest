import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { legalTranslations } from "@/translations/legal";

const UserAgreement = () => {
  const { locale } = useLanguage();
  const localizedLegal = (legalTranslations as any)[locale]?.legal || legalTranslations.en.legal;
  const t = localizedLegal.userAgreement || legalTranslations.tr.legal.userAgreement;

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
              <p className="text-muted-foreground">{localizedLegal.lastUpdated}: 16 {locale === 'tr' ? 'Aralık' : locale === 'de' ? 'Dezember' : locale === 'fr' ? 'Décembre' : 'December'} 2024</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section1Title}</h2>
                <p className="text-muted-foreground">{t.section1Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section2Title}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  {t.section2Items?.map((item: any, i: number) => (
                    <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section3Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section3Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section3Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section4Title}</h2>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section4_1Title}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section4_1Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">{t.section4_2Title}</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section4_2Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section5Title}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section5Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section6Title}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section6Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section7Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section7Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section7Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section8Title}</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section8Items?.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section9Title}</h2>
                <p className="text-muted-foreground">{t.section9Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section10Title}</h2>
                <p className="text-muted-foreground">{t.section10Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section11Title}</h2>
                <p className="text-muted-foreground">{t.section11Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section12Title}</h2>
                <p className="text-muted-foreground">{t.section12Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section13Title}</h2>
                <p className="text-muted-foreground">
                  {t.section13Text} <strong>{localizedLegal.supportEmail}</strong>
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

export default UserAgreement;